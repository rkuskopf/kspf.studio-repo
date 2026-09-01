import { describe, expect, it } from "vitest";

import {
  detectProjectMediaType,
  fetchProjectContent,
  isProjectSlug,
  mapProjectStory,
} from "./project-delivery";

const assetUrl = (name: string) => `https://cdn.example.com/assets/${name}`;

const projectStory = () => ({
  id: 72,
  uuid: "project-uuid",
  name: "Product design tracer",
  slug: "product-design-tracer",
  full_slug: "projects/product-design-tracer",
  content: {
    _uid: "project-content-uid",
    component: "project",
    title: "Product design tracer",
    display_name: "Product design tracer",
    category: "Product Design",
    description: "A minimal schema tracer.",
    show_on_home: false,
    client: "KSPF",
    year: "2026",
    discipline: "Product design",
    thumbnail: {
      filename: assetUrl("thumbnail.webp"),
      content_type: "image/webp",
      fieldtype: "asset",
    },
    tags: [
      { _uid: "tag-1", component: "project_tag", label: "Tracer" },
      { _uid: "tag-2", component: "project_tag", label: "Prototype" },
    ],
    page_enabled: true,
    body: [
      { _uid: "header-1", component: "project_header" },
      {
        _uid: "text-1",
        component: "text",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Tracer copy." }],
            },
          ],
        },
      },
      {
        _uid: "image-1",
        component: "media",
        asset: {
          filename: assetUrl("Frame%2019.PNG?x=1#hero"),
          content_type: "image/png",
          fieldtype: "asset",
        },
        alt: "KSPF brand mark",
        caption: "Image caption",
      },
      {
        _uid: "video-1",
        component: "media",
        asset: {
          filename: assetUrl("tracer.MOV"),
          content_type: "video/quicktime",
          fieldtype: "asset",
        },
        caption: "Video caption",
      },
    ],
  },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("project media detection", () => {
  it.each([
    ["uppercase image extension with URL suffixes", "Frame.PNG?x=1#hero", "image/png", "image"],
    ["uppercase video extension", "clip.MOV", "video/quicktime", "video"],
    ["extension-only image", "poster.webp", undefined, "image"],
    ["MIME-only video", "stream", "video/mp4", "video"],
  ] as const)("classifies an %s", (_label, filename, contentType, expected) => {
    expect(
      detectProjectMediaType({
        filename: assetUrl(filename),
        content_type: contentType,
      })
    ).toBe(expected);
  });

  it.each([
    ["HTTP URL", "http://cdn.example.com/image.png", "image/png"],
    ["JavaScript URL", "javascript:alert(1)", "image/png"],
    ["invalid URL", "not a URL.png", "image/png"],
    ["unsupported type", assetUrl("document.pdf"), "application/pdf"],
    ["disagreeing MIME and extension", assetUrl("clip.mp4"), "image/png"],
  ])("rejects an %s", (_label, filename, contentType) => {
    expect(detectProjectMediaType({ filename, content_type: contentType })).toBeNull();
  });
});

describe("canonical project story mapping", () => {
  it("maps enabled project metadata and discriminated blocks without reordering", () => {
    expect(mapProjectStory(projectStory())).toEqual({
      storyId: 72,
      storyUuid: "project-uuid",
      slug: "product-design-tracer",
      title: "Product design tracer",
      displayName: "Product design tracer",
      category: "Product Design",
      description: "A minimal schema tracer.",
      showOnHome: false,
      metadata: {
        client: "KSPF",
        year: "2026",
        discipline: "Product design",
        thumbnail: { url: assetUrl("thumbnail.webp"), type: "image" },
        tags: ["Tracer", "Prototype"],
      },
      body: [
        { _uid: "header-1", component: "project_header" },
        {
          _uid: "text-1",
          component: "text",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Tracer copy." }],
              },
            ],
          },
        },
        {
          _uid: "image-1",
          component: "media",
          asset: {
            url: assetUrl("Frame%2019.PNG?x=1#hero"),
            type: "image",
          },
          alt: "KSPF brand mark",
          caption: "Image caption",
        },
        {
          _uid: "video-1",
          component: "media",
          asset: { url: assetUrl("tracer.MOV"), type: "video" },
          caption: "Video caption",
        },
      ],
    });
  });

  it("maps absent or empty optional metadata without inventing values", () => {
    const story = projectStory();
    delete (story.content as Record<string, unknown>).client;
    delete (story.content as Record<string, unknown>).year;
    delete (story.content as Record<string, unknown>).discipline;
    story.content.thumbnail = {
      filename: "",
      fieldtype: "asset",
    } as never;
    delete (story.content as Record<string, unknown>).tags;
    story.content.body = [{ _uid: "header-1", component: "project_header" }] as never;

    expect(mapProjectStory(story)?.metadata).toEqual({ tags: [] });
  });

  it.each([
    ["disabled project", { page_enabled: false }],
    ["missing opt-in", { page_enabled: undefined }],
    ["wrong component", { component: "case_study" }],
  ])("maps a %s to null", (_label, contentPatch) => {
    const story = projectStory();
    Object.assign(story.content, contentPatch);
    expect(mapProjectStory(story)).toBeNull();
  });

  it.each([
    ["empty title", { title: "  " }],
    [
      "invalid rich-text document",
      {
        body: [
          { _uid: "header-1", component: "project_header" },
          { _uid: "text-1", component: "text", content: { type: "doc", content: null } },
        ],
      },
    ],
    [
      "unknown body block",
      {
        body: [
          { _uid: "header-1", component: "project_header" },
          { _uid: "gallery-1", component: "gallery" },
        ],
      },
    ],
    ["missing header", { body: [] }],
    [
      "duplicate headers",
      {
        body: [
          { _uid: "header-1", component: "project_header" },
          { _uid: "header-2", component: "project_header" },
        ],
      },
    ],
    [
      "image without alt text",
      {
        body: [
          { _uid: "header-1", component: "project_header" },
          {
            _uid: "image-1",
            component: "media",
            asset: { filename: assetUrl("image.png"), content_type: "image/png" },
          },
        ],
      },
    ],
    [
      "video with non-string alt text",
      {
        body: [
          { _uid: "header-1", component: "project_header" },
          {
            _uid: "video-1",
            component: "media",
            asset: { filename: assetUrl("clip.mp4"), content_type: "video/mp4" },
            alt: 42,
          },
        ],
      },
    ],
    [
      "non-image thumbnail",
      {
        thumbnail: { filename: assetUrl("clip.mp4"), content_type: "video/mp4" },
      },
    ],
    [
      "invalid tag label",
      { tags: [{ _uid: "tag-1", component: "project_tag", label: "" }] },
    ],
    [
      "missing block UID",
      { body: [{ _uid: "", component: "project_header" }] },
    ],
  ])("rejects an enabled project with an %s", (_label, contentPatch) => {
    const story = projectStory();
    Object.assign(story.content, contentPatch);
    expect(() => mapProjectStory(story)).toThrow(/Storyblok project story/);
  });
});

describe("direct Storyblok project delivery", () => {
  it("recognises only a single canonical project slug segment", () => {
    expect(isProjectSlug("product-design-tracer")).toBe(true);
    expect(isProjectSlug("Product-design-tracer")).toBe(false);
    expect(isProjectSlug("product/design-tracer")).toBe(false);
    expect(isProjectSlug("product-design-tracer?token=secret")).toBe(false);
  });

  it("fetches and maps the published AP project story", async () => {
    let requestedUrl: URL | undefined;
    let requestedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedUrl = new URL(String(input));
      requestedInit = init;
      return jsonResponse({ story: projectStory() });
    };

    const content = await fetchProjectContent({
      slug: "product-design-tracer",
      version: "published",
      token: "public-sentinel",
      region: "ap",
      fetchImpl,
      cacheVersion: 123,
    });

    expect(content?.slug).toBe("product-design-tracer");
    expect(requestedUrl?.origin).toBe("https://api-ap.storyblok.com");
    expect(requestedUrl?.pathname).toBe(
      "/v2/cdn/stories/projects/product-design-tracer"
    );
    expect(requestedUrl?.searchParams.get("version")).toBe("published");
    expect(requestedUrl?.searchParams.get("token")).toBe("public-sentinel");
    expect(requestedUrl?.searchParams.has("cv")).toBe(false);
    expect(requestedInit?.cache).toBe("no-store");
    expect(new Headers(requestedInit?.headers).get("Accept")).toBe("application/json");
  });

  it("fetches an uncached draft with the preview token and cache version", async () => {
    let requestedUrl: URL | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = new URL(String(input));
      return jsonResponse({ story: projectStory() });
    };

    await fetchProjectContent({
      slug: "product-design-tracer",
      version: "draft",
      token: "preview-sentinel",
      fetchImpl,
      cacheVersion: 123,
    });

    expect(requestedUrl?.searchParams.get("version")).toBe("draft");
    expect(requestedUrl?.searchParams.get("token")).toBe("preview-sentinel");
    expect(requestedUrl?.searchParams.get("cv")).toBe("123");
  });

  it("returns null for an invalid slug without making a request", async () => {
    let requests = 0;
    const fetchImpl: typeof fetch = async () => {
      requests += 1;
      return jsonResponse({ story: projectStory() });
    };

    await expect(
      fetchProjectContent({
        slug: "../case-studies/aesop",
        version: "published",
        token: "public-sentinel",
        fetchImpl,
      })
    ).resolves.toBeNull();
    expect(requests).toBe(0);
  });

  it("maps a missing project response to null", async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ error: "missing" }, 404);

    await expect(
      fetchProjectContent({
        slug: "missing-project",
        version: "published",
        token: "public-sentinel",
        fetchImpl,
      })
    ).resolves.toBeNull();
  });

  it("names the missing credential for each content version", async () => {
    await expect(
      fetchProjectContent({
        slug: "product-design-tracer",
        version: "published",
        token: "",
      })
    ).rejects.toThrow(/STORYBLOK_PUBLIC_TOKEN/);
    await expect(
      fetchProjectContent({
        slug: "product-design-tracer",
        version: "draft",
        token: "",
      })
    ).rejects.toThrow(/STORYBLOK_PREVIEW_TOKEN/);
  });

  it("reports HTTP failures without exposing credentials, URLs, or bodies", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("public-sentinel private response body", { status: 401 });

    const error = await fetchProjectContent({
      slug: "product-design-tracer",
      version: "published",
      token: "public-sentinel",
      fetchImpl,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Storyblok 401.*project/);
    expect((error as Error).message).not.toContain("public-sentinel");
    expect((error as Error).message).not.toContain("api.storyblok.com");
    expect((error as Error).message).not.toContain("private response body");
  });

  it("redacts credential-bearing network errors", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error(
        "GET https://api.storyblok.com/v2/cdn/stories/projects/product-design-tracer?token=preview-sentinel failed"
      );
    };

    const error = await fetchProjectContent({
      slug: "product-design-tracer",
      version: "draft",
      token: "preview-sentinel",
      fetchImpl,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Storyblok request failed.*project/);
    expect((error as Error).message).not.toContain("preview-sentinel");
    expect((error as Error).message).not.toContain("api.storyblok.com");
  });
});
