#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import {
  createStoryblokManagementApi,
  runProjectPageMigration,
} from "./storyblok-project-page-migration.mjs";

export const parseProjectPageMigrationFlags = (argumentsList) => {
  const flags = new Set(argumentsList);
  if (flags.has("--apply") && flags.has("--publish")) {
    throw new Error("Use --apply and --publish as separate verified steps.");
  }
  return flags.has("--apply") ? "apply" : flags.has("--publish") ? "publish" : "plan";
};

export const runProjectPageMigrationCli = async ({
  argumentsList = process.argv.slice(2),
  environment = process.env,
  logger = console,
} = {}) => {
  const mode = parseProjectPageMigrationFlags(argumentsList);
  const api = createStoryblokManagementApi({
    spaceId: environment.STORYBLOK_SPACE_ID,
    token: environment.STORYBLOK_MANAGEMENT_TOKEN,
    region: environment.STORYBLOK_REGION || "eu",
  });
  const result = await runProjectPageMigration({ api, mode });
  logger.log(`storyblok project-page: ${mode} (${result.actions.length} action${result.actions.length === 1 ? "" : "s"})`);
  for (const action of result.actions) logger.log(`  ${action.kind}`);
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await runProjectPageMigrationCli();
  } catch (error) {
    console.error(`storyblok project-page: ${error.message}`);
    process.exitCode = 1;
  }
}
