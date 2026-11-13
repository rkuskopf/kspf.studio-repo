import { createHash, timingSafeEqual } from "node:crypto";

import type { StoryblokSearchParams, StoryblokVersion } from "./types";

const STORY_ID_PARAM = "_storyblok";
const SPACE_ID_PARAM = "_storyblok_tk[space_id]";
const TIMESTAMP_PARAM = "_storyblok_tk[timestamp]";
const SIGNATURE_PARAM = "_storyblok_tk[token]";
const MAX_SIGNATURE_AGE_SECONDS = 60 * 60;
const MAX_FUTURE_SKEW_SECONDS = 60;

export class StoryblokConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryblokConfigurationError";
  }
}

const scalar = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export function resolveStoryblokVersion({
  nodeEnv,
  searchParams,
  previewToken,
  now = Date.now(),
}: {
  nodeEnv?: string;
  searchParams: StoryblokSearchParams;
  previewToken?: string;
  now?: number;
}): StoryblokVersion {
  if (nodeEnv !== "development") return "published";

  const storyId = scalar(searchParams[STORY_ID_PARAM]);
  const spaceId = scalar(searchParams[SPACE_ID_PARAM]);
  const timestampValue = scalar(searchParams[TIMESTAMP_PARAM]);
  const signature = scalar(searchParams[SIGNATURE_PARAM]);

  if (
    storyId === undefined ||
    spaceId === undefined ||
    timestampValue === undefined ||
    signature === undefined
  ) {
    return "published";
  }

  if (!previewToken) {
    throw new StoryblokConfigurationError(
      "STORYBLOK_PREVIEW_TOKEN is required for local Storyblok Visual Editor preview."
    );
  }

  if (
    !/^[1-9]\d*$/.test(storyId) ||
    !/^[1-9]\d*$/.test(spaceId) ||
    !/^\d+$/.test(timestampValue) ||
    !/^[a-f\d]{40}$/i.test(signature)
  ) {
    return "published";
  }

  const timestamp = Number(timestampValue);
  const nowSeconds = Math.floor(now / 1000);
  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < nowSeconds - MAX_SIGNATURE_AGE_SECONDS ||
    timestamp > nowSeconds + MAX_FUTURE_SKEW_SECONDS
  ) {
    return "published";
  }

  const expected = createHash("sha1")
    .update(`${spaceId}:${previewToken}:${timestampValue}`)
    .digest();
  const provided = Buffer.from(signature, "hex");

  return provided.length === expected.length && timingSafeEqual(provided, expected)
    ? "draft"
    : "published";
}
