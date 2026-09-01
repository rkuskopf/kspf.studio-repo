import "server-only";

import { fetchProjectContent } from "./project-delivery";
import { resolveStoryblokVersion } from "./preview";
import type {
  ProjectPageData,
  StoryblokEnvironment,
  StoryblokSearchParams,
} from "./types";

export async function loadProjectPage({
  slug,
  searchParams,
  environment = process.env,
  fetchImpl = fetch,
  now = Date.now(),
}: {
  slug: string;
  searchParams: StoryblokSearchParams;
  environment?: StoryblokEnvironment;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<ProjectPageData | null> {
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
  const content = await fetchProjectContent({
    slug,
    version,
    token,
    region: environment.STORYBLOK_REGION,
    fetchImpl,
    cacheVersion: now,
  });

  return content ? { content, isPreview: version === "draft" } : null;
}
