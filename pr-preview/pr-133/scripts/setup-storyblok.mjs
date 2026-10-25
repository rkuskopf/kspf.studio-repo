#!/usr/bin/env node

import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { STORYBLOK_COMPONENTS } from "./storyblok-schema.mjs";
import { buildSeedPlan } from "./storyblok-seed.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const replaceExisting = args.has("--replace-existing");
const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const plan = await buildSeedPlan(repoRoot);

const storyCount =
  plan.rootStories.length + plan.folders.reduce((total, folder) => total + folder.stories.length, 0);

if (!apply) {
  console.log("Storyblok setup plan (no remote changes made):");
  console.log(`  ${STORYBLOK_COMPONENTS.length} component schemas`);
  console.log(`  ${plan.folders.length} content folders`);
  console.log(`  ${storyCount} draft stories seeded from the current repo content`);
  console.log("");
  console.log("Run again with --apply after setting STORYBLOK_SPACE_ID and STORYBLOK_MANAGEMENT_TOKEN.");
  console.log("Add --replace-existing only for a new/dedicated space whose starter Home story may be replaced.");
  process.exit(0);
}

const spaceId = process.env.STORYBLOK_SPACE_ID;
const token = process.env.STORYBLOK_MANAGEMENT_TOKEN;
const region = (process.env.STORYBLOK_REGION || "eu").toLowerCase();

if (!spaceId || !/^\d+$/.test(spaceId)) {
  throw new Error("STORYBLOK_SPACE_ID must be the numeric ID of the target Storyblok space.");
}
if (!token) {
  throw new Error("STORYBLOK_MANAGEMENT_TOKEN is required for --apply.");
}

const managementHosts = {
  eu: "https://mapi.storyblok.com/v1",
  us: "https://api-us.storyblok.com/v1",
  ca: "https://api-ca.storyblok.com/v1",
  ap: "https://api-ap.storyblok.com/v1",
  cn: "https://app.storyblokchina.cn/v1",
};
const baseUrl = managementHosts[region];
if (!baseUrl) {
  throw new Error(`Unsupported Storyblok region "${region}". Use eu, us, ca, ap, or cn.`);
}

const api = async (path, { method = "GET", body, query } = {}, attempt = 0) => {
  const url = new URL(`${baseUrl}/spaces/${spaceId}/${path}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 429 && attempt < 3) {
    const retryAfter = Math.max(1, Number(response.headers.get("retry-after")) || 1);
    await delay(retryAfter * 1000);
    return api(path, { method, body, query }, attempt + 1);
  }

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    throw new Error(`Storyblok ${response.status} for ${method} ${path}: ${text.slice(0, 400)}`);
  }
  return data;
};

const listAllStories = async () => {
  const stories = [];
  for (let page = 1; ; page += 1) {
    const data = await api("stories", { query: { page, per_page: 100 } });
    const batch = Array.isArray(data.stories) ? data.stories : [];
    stories.push(...batch);
    if (batch.length < 100) break;
  }
  return stories;
};

const componentData = await api("components/");
const existingComponents = new Map(
  (componentData.components || []).map((component) => [component.name, component])
);

let createdComponents = 0;
for (const component of STORYBLOK_COMPONENTS) {
  if (existingComponents.has(component.name)) {
    console.log(`storyblok: kept existing component ${component.name}`);
    continue;
  }
  await api("components/", { method: "POST", body: { component } });
  createdComponents += 1;
  console.log(`storyblok: created component ${component.name}`);
  await delay(350);
}

const existingStories = await listAllStories();
const storiesBySlug = new Map(existingStories.map((story) => [story.full_slug, story]));

const createStory = async (story, parentId) => {
  const data = await api("stories", {
    method: "POST",
    body: {
      publish: false,
      story: {
        ...story,
        ...(parentId ? { parent_id: parentId } : {}),
      },
    },
  });
  await delay(350);
  return data.story;
};

const updateStory = async (existing, story, parentId) => {
  const data = await api(`stories/${existing.id}`, {
    method: "PUT",
    body: {
      force_update: 1,
      publish: false,
      story: {
        id: existing.id,
        ...story,
        ...(parentId ? { parent_id: parentId } : {}),
      },
    },
  });
  await delay(350);
  return data.story;
};

let createdFolders = 0;
let createdStories = 0;

for (const story of plan.rootStories) {
  const existing = storiesBySlug.get(story.slug);
  if (existing && !replaceExisting) {
    const existingComponent = existing.content?.component || "unknown";
    if (existingComponent !== story.content.component) {
      throw new Error(
        `Existing story "${story.slug}" uses component "${existingComponent}". ` +
          "Use a new space, remove the starter story, or rerun with --replace-existing."
      );
    }
    console.log(`storyblok: kept existing story ${story.slug}`);
    continue;
  }
  const saved = existing ? await updateStory(existing, story) : await createStory(story);
  storiesBySlug.set(saved.full_slug || story.slug, saved);
  if (existing) {
    console.log(`storyblok: replaced draft content for ${story.slug}`);
  } else {
    createdStories += 1;
    console.log(`storyblok: created draft story ${story.slug}`);
  }
}

for (const folder of plan.folders) {
  let remoteFolder = storiesBySlug.get(`${folder.slug}/`) || storiesBySlug.get(folder.slug);
  if (!remoteFolder || !remoteFolder.is_folder) {
    remoteFolder = await createStory({ name: folder.name, slug: folder.slug, is_folder: true });
    createdFolders += 1;
    console.log(`storyblok: created folder ${folder.slug}`);
  } else {
    console.log(`storyblok: kept existing folder ${folder.slug}`);
  }

  for (const story of folder.stories) {
    const fullSlug = `${folder.slug}/${story.slug}`;
    const existing = storiesBySlug.get(fullSlug);
    if (existing && !replaceExisting) {
      const existingComponent = existing.content?.component || "unknown";
      if (existingComponent !== story.content.component) {
        throw new Error(
          `Existing story "${fullSlug}" uses component "${existingComponent}". ` +
            "Use a new space or rerun with --replace-existing."
        );
      }
      console.log(`storyblok: kept existing story ${fullSlug}`);
      continue;
    }
    const saved = existing
      ? await updateStory(existing, story, remoteFolder.id)
      : await createStory(story, remoteFolder.id);
    storiesBySlug.set(saved.full_slug || fullSlug, saved);
    if (existing) {
      console.log(`storyblok: replaced draft content for ${fullSlug}`);
    } else {
      createdStories += 1;
      console.log(`storyblok: created draft story ${fullSlug}`);
    }
  }
}

console.log(
  `storyblok: setup complete (${createdComponents} components, ${createdFolders} folders, ` +
    `${createdStories} draft stories created). Existing matching content was left untouched.`
);
