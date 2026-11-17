#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual as equal } from 'node:util';
import { fileURLToPath } from 'node:url';
import { STORYBLOK_COMPONENTS } from './storyblok-schema.mjs';
import { createStoryblokManagementApi } from './storyblok-project-page-migration.mjs';

const field = STORYBLOK_COMPONENTS.find(c => c.name === 'home_page').schema.snap_scrolling;

// Deliberately updates only the component schema: stories and publication are untouched.
export async function runHomeScrollMigration({api, apply = false, backup}) {
  const read = async () => (await api.listComponents()).find(c => c.name === 'home_page');
  const original = await read();
  if (!original?.schema) throw new Error('Existing home_page schema is required.');
  const existing = original.schema.snap_scrolling;
  if (existing) {
    const definition = Object.fromEntries(Object.keys(field).map(key => [key, existing[key]]));
    if (definition.default_value === false || definition.default_value == null) definition.default_value = 'false';
    if (!equal(definition, field)) throw new Error('Existing snap_scrolling field conflicts with the approved definition.');
    return {changed: false, applied: false};
  }
  if (!apply) return {changed: true, applied: false};
  if (typeof backup !== 'function') throw new Error('A durable schema backup is required.');
  const fresh = await read();
  if (!equal(fresh, original)) throw new Error('Home schema changed while planning; rerun.');
  await backup(original);
  await api.updateComponent(original.id, {
    ...original, schema: {...original.schema, snap_scrolling: structuredClone(field)},
  });
  return {changed: true, applied: true};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some(arg => arg !== '--apply')) throw new Error('Use no flags to plan or --apply to add the field.');
    const api = createStoryblokManagementApi({
      spaceId: process.env.STORYBLOK_SPACE_ID,
      token: process.env.STORYBLOK_MANAGEMENT_TOKEN,
      region: process.env.STORYBLOK_REGION || 'eu',
    });
    const result = await runHomeScrollMigration({api, apply: args.includes('--apply'), backup: async component => {
      await mkdir('.storyblok-backups', {recursive: true, mode: 0o700});
      const filename = `.storyblok-backups/home-scroll-${Date.now()}-${crypto.randomUUID()}.json`;
      await writeFile(filename, JSON.stringify(component, null, 2), {flag: 'wx', mode: 0o600});
      console.log(`Saved rollback backup: ${filename}`);
    }});
    console.log(JSON.stringify(result));
  } catch(error) { console.error(`storyblok home scroll: ${error.message}`); process.exitCode = 1; }
}
