#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildContentFiles } from "./storyblok-content.mjs";

const args = process.argv.slice(2);

const option = (name, fallback = "") => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
};

const hasFlag = (name) => args.includes(name);
const version = option("--version", "published");
const targetDir = resolve(option("--target", "."));
const region = option("--region", process.env.STORYBLOK_REGION || "eu").toLowerCase();
const optional = hasFlag("--optional");
const dryRun = hasFlag("--dry-run");

if (!new Set(["published", "draft"]).has(version)) {
  throw new Error('--version must be either "published" or "draft".');
}

const token =
  option("--token") ||
  process.env.STORYBLOK_ACCESS_TOKEN ||
  (version === "draft"
    ? process.env.STORYBLOK_PREVIEW_TOKEN
    : process.env.STORYBLOK_PUBLIC_TOKEN);

if (!token) {
  if (optional) {
    console.log("storyblok: no delivery token configured; using the checked-in content snapshot.");
    process.exit(0);
  }
  throw new Error(
    `Missing Storyblok ${version === "draft" ? "preview" : "public"} token. ` +
      `Set STORYBLOK_${version === "draft" ? "PREVIEW" : "PUBLIC"}_TOKEN.`
  );
}

const deliveryHosts = {
  eu: "https://api.storyblok.com/v2/cdn",
  us: "https://api-us.storyblok.com/v2/cdn",
  ca: "https://api-ca.storyblok.com/v2/cdn",
  ap: "https://api-ap.storyblok.com/v2/cdn",
  cn: "https://app.storyblokchina.cn/v2/cdn",
};

const baseUrl = deliveryHosts[region];
if (!baseUrl) {
  throw new Error(`Unsupported Storyblok region "${region}". Use eu, us, ca, ap, or cn.`);
}

const request = async (path, params = {}) => {
  const url = new URL(`${baseUrl}/${path}`);
  url.searchParams.set("token", token);
  url.searchParams.set("version", version);
  url.searchParams.set("cv", String(Date.now()));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Storyblok ${response.status} for ${path}: ${detail}`);
  }
  return response.json();
};

const getStory = async (slug) => {
  const data = await request(`stories/${slug}`);
  if (!data.story) throw new Error(`Storyblok did not return the required "${slug}" story.`);
  return data.story;
};

const getStories = async (startsWith, contentType) => {
  const data = await request("stories", {
    starts_with: startsWith,
    content_type: contentType,
    per_page: 100,
  });
  return Array.isArray(data.stories) ? data.stories : [];
};

const [site, home, experience, projects, caseStudies] = await Promise.all([
  getStory("site"),
  getStory("home"),
  getStory("experience"),
  getStories("projects/", "project"),
  getStories("case-studies/", "case_study"),
]);

const files = buildContentFiles({ site, home, experience, projects, caseStudies });

if (dryRun) {
  console.log(`storyblok: validated ${files.size} generated content files (${version}, ${region}).`);
  for (const path of files.keys()) console.log(`  ${path}`);
  process.exit(0);
}

for (const [relativePath, content] of files) {
  const outputPath = join(targetDir, relativePath);
  const tempPath = `${outputPath}.storyblok-tmp`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  await rename(tempPath, outputPath);
}

console.log(
  `storyblok: synced ${projects.length} projects, ${caseStudies.length} case studies, and shared page content (${version}, ${region}).`
);
