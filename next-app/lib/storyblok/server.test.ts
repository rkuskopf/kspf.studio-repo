import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadHomePage } from "./server";

const NOW = Date.UTC(2026, 7, 27, 6, 0, 0);
const NOW_SECONDS = Math.floor(NOW / 1000);
const PREVIEW_TOKEN = "preview-sentinel";

const signedParams = () => {
  const spaceId = "313862";
  const signature = createHash("sha1")
    .update(`${spaceId}:${PREVIEW_TOKEN}:${NOW_SECONDS}`)
    .digest("hex");

  return {
    _storyblok: "42",
    "_storyblok_tk[space_id]": spaceId,
    "_storyblok_tk[timestamp]": String(NOW_SECONDS),
    "_storyblok_tk[token]": signature,
  };
};

const homeResponse = {
  story: {
    id: 42,
    uuid: "home-uuid",
    name: "Home",
    slug: "home",
    full_slug: "home",
    content: {
      _uid: "home-content-uid",
      component: "home_page",
      title: "kspf.studio",
      meta_description: "Portfolio",
      intro: "Art Direction + Web Development",
    },
  },
};

const requestRecorder = () => {
  const requests: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    requests.push(new URL(String(input)));
    return new Response(JSON.stringify(homeResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { requests, fetchImpl };
};

describe("the server-only homepage boundary", () => {
  it("uses the public token and published content for a normal request", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadHomePage({
      searchParams: {},
      environment: {
        NODE_ENV: "development",
        STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
        STORYBLOK_PREVIEW_TOKEN: PREVIEW_TOKEN,
        STORYBLOK_REGION: "ap",
      },
      fetchImpl,
      now: NOW,
    });

    expect(data.isPreview).toBe(false);
    expect(data.content.title).toBe("kspf.studio");
    expect(requests[0].searchParams.get("version")).toBe("published");
    expect(requests[0].searchParams.get("token")).toBe("public-sentinel");
  });

  it("uses the preview token and draft content for a signed local request", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadHomePage({
      searchParams: signedParams(),
      environment: {
        NODE_ENV: "development",
        STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
        STORYBLOK_PREVIEW_TOKEN: PREVIEW_TOKEN,
        STORYBLOK_REGION: "eu",
      },
      fetchImpl,
      now: NOW,
    });

    expect(data.isPreview).toBe(true);
    expect(requests[0].searchParams.get("version")).toBe("draft");
    expect(requests[0].searchParams.get("token")).toBe(PREVIEW_TOKEN);
    expect(requests[0].searchParams.get("cv")).toBe(String(NOW));
  });

  it("forces a signed production request through published delivery", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadHomePage({
      searchParams: signedParams(),
      environment: {
        NODE_ENV: "production",
        STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
        STORYBLOK_PREVIEW_TOKEN: PREVIEW_TOKEN,
      },
      fetchImpl,
      now: NOW,
    });

    expect(data.isPreview).toBe(false);
    expect(requests[0].searchParams.get("version")).toBe("published");
    expect(requests[0].searchParams.get("token")).toBe("public-sentinel");
  });

  it("fails clearly when published delivery is not configured", async () => {
    await expect(
      loadHomePage({
        searchParams: {},
        environment: { NODE_ENV: "development" },
        fetchImpl: requestRecorder().fetchImpl,
        now: NOW,
      })
    ).rejects.toThrow(/STORYBLOK_PUBLIC_TOKEN/);
  });

  it("fails clearly when a complete local preview lacks its preview token", async () => {
    await expect(
      loadHomePage({
        searchParams: signedParams(),
        environment: {
          NODE_ENV: "development",
          STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
        },
        fetchImpl: requestRecorder().fetchImpl,
        now: NOW,
      })
    ).rejects.toThrow(/STORYBLOK_PREVIEW_TOKEN/);
  });
});
