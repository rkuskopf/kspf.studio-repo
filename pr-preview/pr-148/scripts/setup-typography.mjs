#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createStoryblokManagementApi } from "./storyblok-project-page-migration.mjs";
import { TYPOGRAPHY_COMPONENTS, TYPOGRAPHY_FIELD, NAV_WEIGHT_FIELDS } from "./storyblok-typography-schema.mjs";

const withoutId = (field) => {
  const { id, ...rest } = field;
  return rest;
};
export async function runTypographyMigration({ api, apply = false }) {
  const components = await api.listComponents();
  const byName = new Map(components.map((component) => [component.name, component]));
  const changes = [];
  // Validate the complete plan before writing; never replace conflicting fields.
  for (const [name, fields, definition] of [
    ...TYPOGRAPHY_COMPONENTS.map((component) => [component.name, component.schema, component]),
    ["site_settings", { typography: TYPOGRAPHY_FIELD }],
    ["nav_settings", NAV_WEIGHT_FIELDS],
  ]) {
    const existing = byName.get(name);
    if (!existing) {
      if (!definition) throw new Error(`Missing required component ${name}.`);
      changes.push({ kind: "create", component: definition });
      continue;
    }
    if (definition && (existing.is_root !== definition.is_root || existing.is_nestable !== definition.is_nestable)) {
      throw new Error(`Existing ${name} has incompatible component settings; refusing replacement.`);
    }
    const merged = structuredClone(existing);
    let changed = false;
    for (const [key, field] of Object.entries(fields)) {
      if (Object.hasOwn(merged.schema, key)) {
        if (!isDeepStrictEqual(withoutId(merged.schema[key]), field)) {
          throw new Error(`Existing ${name}.${key} conflicts with typography schema; refusing replacement.`);
        }
      } else {
        merged.schema[key] = structuredClone(field);
        changed = true;
      }
    }
    if (changed) changes.push({ kind: "update", component: merged });
  }
  if (apply) {
    for (const change of changes) {
      if (change.kind === "create") await api.createComponent(change.component);
      else await api.updateComponent(change.component.id, change.component);
    }
  }
  return changes.map(({ kind, component }) => ({ kind, name: component.name }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const api = createStoryblokManagementApi({
      spaceId: process.env.STORYBLOK_SPACE_ID,
      token: process.env.STORYBLOK_MANAGEMENT_TOKEN,
      region: process.env.STORYBLOK_REGION || "eu",
    });
    const apply = process.argv.includes("--apply");
    const actions = await runTypographyMigration({ api, apply });
    console.log(`Typography schema ${apply ? "applied" : "plan"}: ${JSON.stringify(actions)}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
