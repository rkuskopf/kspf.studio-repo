import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { resolveStoryblokVersion } from "./preview";

const NOW = Date.UTC(2026, 7, 27, 6, 0, 0);
const NOW_SECONDS = Math.floor(NOW / 1000);
const PREVIEW_TOKEN = "preview-secret";

const signedParams = (
  timestamp = NOW_SECONDS,
  overrides: Record<string, string | string[] | undefined> = {}
) => {
  const spaceId = "313862";
  const signature = createHash("sha1")
    .update(`${spaceId}:${PREVIEW_TOKEN}:${timestamp}`)
    .digest("hex");

  return {
    _storyblok: "580906535",
    "_storyblok_tk[space_id]": spaceId,
    "_storyblok_tk[timestamp]": String(timestamp),
    "_storyblok_tk[token]": signature,
    ...overrides,
  };
};

const resolve = ({
  nodeEnv = "development",
  searchParams = signedParams(),
  previewToken = PREVIEW_TOKEN,
  now = NOW,
}: {
  nodeEnv?: string;
  searchParams?: Record<string, string | string[] | undefined>;
  previewToken?: string;
  now?: number;
} = {}) =>
  resolveStoryblokVersion({ nodeEnv, searchParams, previewToken, now });

describe("Storyblok Visual Editor request authentication", () => {
  it("accepts Storyblok's complete signed parameter set during development", () => {
    expect(resolve()).toBe("draft");
  });

  it("keeps production published-only even with valid Storyblok parameters", () => {
    expect(resolve({ nodeEnv: "production", previewToken: "" })).toBe("published");
  });

  it("does not trust arbitrary or incomplete query parameters", () => {
    expect(resolve({ searchParams: { preview: "true" } })).toBe("published");
    expect(resolve({ searchParams: { _storyblok: "580906535" } })).toBe("published");
  });

  it("rejects repeated Visual Editor parameter values", () => {
    expect(
      resolve({
        searchParams: signedParams(NOW_SECONDS, {
          "_storyblok_tk[space_id]": ["313862", "313862"],
        }),
      })
    ).toBe("published");
  });

  it("rejects malformed IDs, timestamps, and signatures", () => {
    expect(resolve({ searchParams: signedParams(NOW_SECONDS, { _storyblok: "home" }) })).toBe(
      "published"
    );
    expect(
      resolve({
        searchParams: signedParams(NOW_SECONDS, {
          "_storyblok_tk[space_id]": "space",
        }),
      })
    ).toBe("published");
    expect(
      resolve({
        searchParams: signedParams(NOW_SECONDS, {
          "_storyblok_tk[timestamp]": "today",
        }),
      })
    ).toBe("published");
    expect(
      resolve({
        searchParams: signedParams(NOW_SECONDS, {
          "_storyblok_tk[token]": "not-a-sha1-digest",
        }),
      })
    ).toBe("published");
  });

  it("rejects signatures created with another preview token", () => {
    expect(resolve({ previewToken: "different-preview-token" })).toBe("published");
  });

  it("accepts the exact timestamp boundaries", () => {
    expect(resolve({ searchParams: signedParams(NOW_SECONDS - 3600) })).toBe("draft");
    expect(resolve({ searchParams: signedParams(NOW_SECONDS + 60) })).toBe("draft");
  });

  it("rejects expired and excessively future-dated signatures", () => {
    expect(resolve({ searchParams: signedParams(NOW_SECONDS - 3601) })).toBe("published");
    expect(resolve({ searchParams: signedParams(NOW_SECONDS + 61) })).toBe("published");
  });

  it("reports missing preview configuration only for a complete parameter set", () => {
    expect(() => resolve({ previewToken: "" })).toThrow(/STORYBLOK_PREVIEW_TOKEN/);
    expect(
      resolve({ searchParams: { _storyblok: "580906535" }, previewToken: "" })
    ).toBe("published");
  });
});
