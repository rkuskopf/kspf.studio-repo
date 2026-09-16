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
  const [content, site, projects] = await Promise.all([
    fetchHomeContent(deliveryOptions),
    fetchSiteContent(deliveryOptions),
    fetchHomepageProjects(deliveryOptions),
  ]);
  if (projects.length === 0) {
    throw new Error("Storyblok homepage has no visible projects.");
  }

  return { content, site, projects, isPreview: version === "draft" };
}
