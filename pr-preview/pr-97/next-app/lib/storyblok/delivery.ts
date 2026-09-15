import { StoryblokConfigurationError } from "./preview";
import type { HomeContent, StoryblokVersion } from "./types";

const DELIVERY_HOSTS = {
  eu: "https://api.storyblok.com/v2/cdn",
  us: "https://api-us.storyblok.com/v2/cdn",
  ca: "https://api-ca.storyblok.com/v2/cdn",
  ap: "https://api-ap.storyblok.com/v2/cdn",
  cn: "https://app.storyblokchina.cn/v2/cdn",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidHomeStory = (detail: string): never => {
  throw new Error(`Storyblok home story ${detail}.`);
};

export const storyblokDeliveryBaseUrl = (region = "eu") => {
  const normalized = region.toLowerCase() as keyof typeof DELIVERY_HOSTS;
  const baseUrl = DELIVERY_HOSTS[normalized];
  if (!baseUrl) {
    throw new StoryblokConfigurationError(
      `Unsupported Storyblok region "${region.toLowerCase()}". Use eu, us, ca, ap, or cn.`
    );
  }
  return baseUrl;
};

const mapHomeContent = (payload: unknown): HomeContent => {
  if (!isRecord(payload) || !isRecord(payload.story)) {
    return invalidHomeStory("is missing from the delivery response");
  }

  const { story } = payload;
  if (!Number.isSafeInteger(story.id) || Number(story.id) <= 0) {
    return invalidHomeStory("has an invalid numeric ID");
  }
  if (typeof story.uuid !== "string" || !story.uuid) {
    return invalidHomeStory("has an invalid UUID");
  }
  if (!isRecord(story.content)) {
    return invalidHomeStory("has invalid content");
  }

  const content = story.content;
  if (content.component !== "home_page") {
    return invalidHomeStory('must use the "home_page" component');
  }
  if (typeof content.title !== "string") {
    return invalidHomeStory("has an invalid title");
  }
  if (typeof content.intro !== "string") {
    return invalidHomeStory("has an invalid intro");
  }
  if (
    content.meta_description !== undefined &&
    typeof content.meta_description !== "string"
  ) {
    return invalidHomeStory("has an invalid meta description");
  }

  return {
    storyId: story.id as number,
    storyUuid: story.uuid,
    title: content.title,
    metaDescription: content.meta_description ?? "",
    intro: content.intro,
  };
};

export async function fetchHomeContent({
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<HomeContent> {
  const tokenVariable =
    version === "draft" ? "STORYBLOK_PREVIEW_TOKEN" : "STORYBLOK_PUBLIC_TOKEN";
  if (!token?.trim()) {
    throw new StoryblokConfigurationError(
      `${tokenVariable} is required for Storyblok ${version} delivery.`
    );
  }

  const url = new URL(`${storyblokDeliveryBaseUrl(region)}/stories/home`);
  url.searchParams.set("token", token);
  url.searchParams.set("version", version);
  if (version === "draft") url.searchParams.set("cv", String(cacheVersion));

  let response: Response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error('Storyblok request failed while fetching "home".');
  }

  if (!response.ok) {
    throw new Error(`Storyblok ${response.status} while fetching "home".`);
  }

  return mapHomeContent(await response.json());
}
