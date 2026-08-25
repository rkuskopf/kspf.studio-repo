#!/usr/bin/env node

import assert from "node:assert/strict";
import { buildContentFiles } from "./storyblok-content.mjs";
import { STORYBLOK_COMPONENTS } from "./storyblok-schema.mjs";
import { buildSeedPlan } from "./storyblok-seed.mjs";

const plan = await buildSeedPlan(process.cwd());
const roots = Object.fromEntries(
  plan.rootStories.map((story) => [story.slug, { ...story, full_slug: story.slug }])
);
const folderStories = (slug) =>
  plan.folders
    .find((folder) => folder.slug === slug)
    .stories.map((story, position) => ({
      ...story,
      full_slug: `${slug}/${story.slug}`,
      position,
    }));

const files = buildContentFiles({
  site: roots.site,
  home: roots.home,
  experience: roots.experience,
  projects: folderStories("projects"),
  caseStudies: folderStories("case-studies"),
});

const projectSeeds = plan.folders.find((folder) => folder.slug === "projects").stories;
const caseStudySeeds = plan.folders.find((folder) => folder.slug === "case-studies").stories;
const footerSeed = roots.site.content.footer[0];

const componentNames = STORYBLOK_COMPONENTS.map((component) => component.name);
assert.equal(new Set(componentNames).size, componentNames.length, "Component names must be unique");
const componentNameSet = new Set(componentNames);
STORYBLOK_COMPONENTS.forEach((component) => {
  Object.values(component.schema).forEach((schemaField) => {
    (schemaField.component_whitelist || []).forEach((allowed) => {
      assert(componentNameSet.has(allowed), `${component.name} references missing component ${allowed}`);
    });
  });
});

const projectData = files.get("projects.json");
assert.equal(
  projectData.projects.length,
  projectSeeds.length,
  "All current projects should survive the import"
);
projectData.projects.forEach((project, index) => {
  const seed = projectSeeds[index].content;
  assert.equal(project.displayName, seed.display_name, "Project order should be stable");
  assert.equal(project.slides.length, seed.slides.length, "Project media should survive the import");
});
assert.equal(
  files.get("content/site.json").footer.columns.length,
  footerSeed.columns.length,
  "Footer structure should survive the import"
);
caseStudySeeds.forEach((story) => {
  assert(
    files.has(`content/case-studies/${story.slug}.json`),
    `Case-study path should survive the import: ${story.slug}`
  );
});

console.log(
  `storyblok verification: ${STORYBLOK_COMPONENTS.length} components, ${files.size} files, ` +
    `${projectData.projects.length} projects`
);
