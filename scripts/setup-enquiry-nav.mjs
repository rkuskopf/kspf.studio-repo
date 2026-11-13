#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual as equal } from 'node:util';
import { fileURLToPath } from 'node:url';
import { STORYBLOK_COMPONENTS } from './storyblok-schema.mjs';
import { createStoryblokManagementApi } from './storyblok-project-page-migration.mjs';

const schema = STORYBLOK_COMPONENTS.find(component => component.name === 'nav_settings').schema;
const fields = {show_enquire:schema.show_enquire, enquire_href:schema.enquire_href};

// Add fields only; do not edit stories, toggle navigation, or publish content.
export async function runEnquiryNavMigration({api, apply = false, backup}) {
  const read = async () => (await api.listComponents()).find(component => component.name === 'nav_settings');
  const original = await read();
  if (!original?.schema) throw new Error('Existing nav_settings schema is required.');
  const missing = {};
  for (const [name, field] of Object.entries(fields)) {
    const existing = original.schema[name];
    if (!existing) { missing[name] = structuredClone(field); continue; }
    const definition = Object.fromEntries(Object.keys(field).map(key => [key, existing[key]]));
    if (field.type === 'boolean' && (definition.default_value === false || definition.default_value == null)) {
      definition.default_value = 'false';
    }
    if (!equal(definition, field)) throw new Error(`Existing ${name} field conflicts with the approved definition.`);
  }
  if (!Object.keys(missing).length) return {changed:false, applied:false};
  if (!apply) return {changed:true, applied:false};
  if (typeof backup !== 'function') throw new Error('A durable schema backup is required.');
  if (!equal(await read(), original)) throw new Error('Navigation schema changed while planning; rerun.');
  await backup(original);
  await api.updateComponent(original.id, {...original, schema:{...original.schema, ...missing}});
  const updated = await read();
  for (const [name, field] of Object.entries(missing)) {
    if (!equal(Object.fromEntries(Object.keys(field).map(key => [key, updated?.schema?.[name]?.[key]])), field)) {
      throw new Error(`Could not verify saved ${name} field; inspect the schema backup before retrying.`);
    }
  }
  return {changed:true, applied:true};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || args.some(arg => arg !== '--apply')) throw new Error('Use no flags to plan or --apply to add the fields.');
    const api = createStoryblokManagementApi({
      spaceId:process.env.STORYBLOK_SPACE_ID, token:process.env.STORYBLOK_MANAGEMENT_TOKEN,
      region:process.env.STORYBLOK_REGION || 'eu',
    });
    const result = await runEnquiryNavMigration({api, apply:args.includes('--apply'), backup:async component => {
      await mkdir('.storyblok-backups', {recursive:true, mode:0o700});
      const filename = `.storyblok-backups/enquiry-nav-${Date.now()}-${crypto.randomUUID()}.json`;
      await writeFile(filename, JSON.stringify(component,null,2), {flag:'wx', mode:0o600});
      console.log(`Saved rollback backup: ${filename}`);
    }});
    console.log(JSON.stringify(result));
  } catch (error) { console.error(`storyblok enquiry navigation: ${error.message}`); process.exitCode = 1; }
}
