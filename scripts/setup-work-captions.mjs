#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStoryblokManagementApi } from './storyblok-project-page-migration.mjs';
import { parseHomepageMigrationFlags } from './setup-homepage.mjs';
import { runWorkCaptionMigration } from './work-caption-migration.mjs';

export async function runWorkCaptionMigrationCli({argumentsList=process.argv.slice(2), environment=process.env, logger=console, backupDirectory='.storyblok-backups'}={}) {
  const mode = parseHomepageMigrationFlags(argumentsList);
  const api = createStoryblokManagementApi({spaceId:environment.STORYBLOK_SPACE_ID, token:environment.STORYBLOK_MANAGEMENT_TOKEN, region:environment.STORYBLOK_REGION || 'eu'});
  const result = await runWorkCaptionMigration({api, mode, backup: async snapshot => {
    await mkdir(backupDirectory, {recursive:true, mode:0o700});
    const filename = join(backupDirectory, `work-captions-${Date.now()}-${crypto.randomUUID()}.json`);
    await writeFile(filename, JSON.stringify(snapshot,null,2), {flag:'wx',mode:0o600});
    logger.log(`Saved rollback backup: ${filename}`);
  }});
  logger.log(`storyblok Work captions: ${mode} (${result.actions.length} actions)`);
  for (const action of result.actions) logger.log(JSON.stringify(action));
  return result;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await runWorkCaptionMigrationCli(); }
  catch (error) { console.error(`storyblok Work captions: ${error.message}`); process.exitCode=1; }
}
