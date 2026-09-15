import "server-only";

import { fetchHomeContent } from "./delivery";
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
  const content = await fetchHomeContent({
    version,
    token,
    region: environment.STORYBLOK_REGION,
    fetchImpl,
    cacheVersion: now,
  });

  return { content, isPreview: version === "draft" };
}
