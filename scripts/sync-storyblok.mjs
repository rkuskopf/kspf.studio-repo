#!/usr/bin/env node

import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchStoryblokContent } from "./storyblok-delivery.mjs";

export const runStoryblokSync = async ({
  token,
  version = "published",
  region = "eu",
  targetDir = ".",
  optional = false,
  dryRun = false,
  fetchImpl = fetch,
  logger = console,
}) => {
  if (!new Set(["published", "draft"]).has(version)) {
    throw new Error('--version must be either "published" or "draft".');
  }

  if (!token) {
    if (optional) {
      logger.log("storyblok: no delivery token configured; using the checked-in content snapshot.");
      return { skipped: true };
    }
    throw new Error(
      `Missing Storyblok ${version === "draft" ? "preview" : "public"} token. ` +
        `Set STORYBLOK_${version === "draft" ? "PREVIEW" : "PUBLIC"}_TOKEN.`
    );
  }

  const result = await fetchStoryblokContent({
    token,
    version,
    region,
    fetchImpl,
  });
  const { files, projects, caseStudies } = result;

  if (dryRun) {
    logger.log(`storyblok: validated ${files.size} generated content files (${version}, ${region}).`);
    for (const path of files.keys()) logger.log(`  ${path}`);
    return { ...result, skipped: false };
  }

  for (const [relativePath, content] of files) {
    const outputPath = join(targetDir, relativePath);
    const tempPath = `${outputPath}.storyblok-tmp`;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
    await rename(tempPath, outputPath);
  }

  logger.log(
    `storyblok: synced ${projects.length} projects, ${caseStudies.length} case studies, ` +
      `and shared page content (${version}, ${region}).`
  );
  return { ...result, skipped: false };
};

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && resolve(process.argv[1]) === currentFile;
if (isMain) {
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
  const token =
    option("--token") ||
    process.env.STORYBLOK_ACCESS_TOKEN ||
    (version === "draft"
      ? process.env.STORYBLOK_PREVIEW_TOKEN
      : process.env.STORYBLOK_PUBLIC_TOKEN);

  await runStoryblokSync({
    token,
    version,
    targetDir: resolve(option("--target", ".")),
    region: option("--region", process.env.STORYBLOK_REGION || "eu").toLowerCase(),
    optional: hasFlag("--optional"),
    dryRun: hasFlag("--dry-run"),
  });
}
