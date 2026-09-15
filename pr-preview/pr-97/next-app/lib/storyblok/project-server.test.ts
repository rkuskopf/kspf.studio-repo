import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadProjectPage } from "./project-server";

const NOW = Date.UTC(2026, 7, 27, 6, 0, 0);
const NOW_SECONDS = Math.floor(NOW / 1000);
const PREVIEW_TOKEN = "preview-sentinel";
const SLUG = "product-design-tracer";

const signedParams = () => {
  const spaceId = "313862";
  const signature = createHash("sha1")
    .update(`${spaceId}:${PREVIEW_TOKEN}:${NOW_SECONDS}`)
    .digest("hex");

  return {
    _storyblok: "72",
    "_storyblok_tk[space_id]": spaceId,
    "_storyblok_tk[timestamp]": String(NOW_SECONDS),
    "_storyblok_tk[token]": signature,
  };
};

const projectStory = () => ({
  id: 72,
  uuid: "project-uuid",
  name: "Product design tracer",
  slug: SLUG,
  full_slug: `projects/${SLUG}`,
  content: {
    _uid: "project-content-uid",
    component: "project",
    title: "Product design tracer",
    display_name: "Product design tracer",
    category: "Product Design",
    description: "A minimal schema tracer.",
    page_enabled: true,
    body: [{ _uid: "header-1", component: "project_header" }],
  },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const requestRecorder = (story: unknown = projectStory()) => {
  const requests: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    requests.push(new URL(String(input)));
    return jsonResponse({ story });
  };
  return { requests, fetchImpl };
};

const environment = {
  STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
  STORYBLOK_PREVIEW_TOKEN: PREVIEW_TOKEN,
  STORYBLOK_REGION: "ap",
};

describe("the server-only project page boundary", () => {
  it("uses the public token and published content for a normal request", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadProjectPage({
      slug: SLUG,
      searchParams: {},
      environment: { NODE_ENV: "development", ...environment },
      fetchImpl,
      now: NOW,
    });

    expect(data).toMatchObject({
      isPreview: false,
      content: { slug: SLUG },
    });
    expect(requests[0].searchParams.get("version")).toBe("published");
    expect(requests[0].searchParams.get("token")).toBe("public-sentinel");
    expect(requests[0].searchParams.has("cv")).toBe(false);
  });

  it("uses the preview token and draft content for a signed local request", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadProjectPage({
      slug: SLUG,
      searchParams: signedParams(),
      environment: { NODE_ENV: "development", ...environment },
      fetchImpl,
      now: NOW,
    });

    expect(data).toMatchObject({
      isPreview: true,
      content: { slug: SLUG },
    });
    expect(requests[0].searchParams.get("version")).toBe("draft");
    expect(requests[0].searchParams.get("token")).toBe(PREVIEW_TOKEN);
    expect(requests[0].searchParams.get("cv")).toBe(String(NOW));
  });

  it("forces a signed production request through published delivery", async () => {
    const { requests, fetchImpl } = requestRecorder();

    const data = await loadProjectPage({
      slug: SLUG,
      searchParams: signedParams(),
      environment: { NODE_ENV: "production", ...environment },
      fetchImpl,
      now: NOW,
    });

    expect(data).toMatchObject({
      isPreview: false,
      content: { slug: SLUG },
    });
    expect(requests[0].searchParams.get("version")).toBe("published");
    expect(requests[0].searchParams.get("token")).toBe("public-sentinel");
  });

  it.each([
    ["an invalid slug", "../case-studies/aesop", projectStory()],
    ["a missing story", "missing-project", undefined],
    ["a disabled story", SLUG, { ...projectStory(), content: { ...projectStory().content, page_enabled: false } }],
  ])("maps %s through to null", async (_label, slug, story) => {
    const recorder =
      story === undefined
        ? {
            requests: [] as URL[],
            fetchImpl: async (input: RequestInfo | URL) => {
              recorder.requests.push(new URL(String(input)));
              return jsonResponse({ error: "missing" }, 404);
            },
          }
        : requestRecorder(story);

    await expect(
      loadProjectPage({
        slug,
        searchParams: {},
        environment: { NODE_ENV: "development", ...environment },
        fetchImpl: recorder.fetchImpl,
        now: NOW,
      })
    ).resolves.toBeNull();
  });

  it("keeps the published-delivery configuration error focused", async () => {
    await expect(
      loadProjectPage({
        slug: SLUG,
        searchParams: {},
        environment: { NODE_ENV: "development" },
        fetchImpl: requestRecorder().fetchImpl,
        now: NOW,
      })
    ).rejects.toThrow(/STORYBLOK_PUBLIC_TOKEN/);
  });

  it("keeps the local-preview configuration error focused", async () => {
    await expect(
      loadProjectPage({
        slug: SLUG,
        searchParams: signedParams(),
        environment: { NODE_ENV: "development", STORYBLOK_PUBLIC_TOKEN: "public-sentinel" },
        fetchImpl: requestRecorder().fetchImpl,
        now: NOW,
      })
    ).rejects.toThrow(/STORYBLOK_PREVIEW_TOKEN/);
  });
});
