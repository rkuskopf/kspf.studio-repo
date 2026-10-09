import "server-only";

import {
  fetchHomeContent,
  fetchHomepageProjects,
  fetchSiteContent,
} from "./delivery";
import { resolveStoryblokVersion } from "./preview";
import type {
  HomePageData,
  StoryblokEnvironment,
  StoryblokSearchParams,
} from "./types";

export async function loadHomePage({
  searchParams,
  environment = process.env,
  fetchImpl = fetch,
  now = Date.now(),
}: {
  searchParams: StoryblokSearchParams;
  environment?: StoryblokEnvironment;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<HomePageData> {
  const version = resolveStoryblokVersion({
    nodeEnv: environment.NODE_ENV,
    searchParams,
    previewToken: environment.STORYBLOK_PREVIEW_TOKEN,
    now,
  });
  const token =
    version === "draft"
      ? environment.STORYBLOK_PREVIEW_TOKEN
      : environment.STORYBLOK_PUBLIC_TOKEN;
  const deliveryOptions = {
    version,
    token,
    region: environment.STORYBLOK_REGION,
    fetchImpl,
    cacheVersion: now,
  };
  const content = await fetchHomeContent(deliveryOptions);
  const references = content.body
    ? [...new Set(content.body.flatMap(block => block.component === "project_feed" ? [] : [block.site]))]
    : [undefined];
  const [resolvedSites, projects] = await Promise.all([
    Promise.all(references.map(storyUuid => fetchSiteContent({ ...deliveryOptions, storyUuid }))),
    fetchHomepageProjects(deliveryOptions),
  ]);
  const sites = Object.fromEntries(resolvedSites.map(site => [site.storyUuid, site]));
  const site = resolvedSites[0];
  if (projects.length === 0) {
    throw new Error("Storyblok homepage has no visible projects.");
  }

  return { content, site, sites, projects, isPreview: version === "draft" };
}
