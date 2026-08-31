import { describe, expect, it } from "vitest";

import { fetchHomeContent } from "./delivery";

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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("direct Storyblok home delivery", () => {
  it("fetches and maps the published AP home story", async () => {
    let requestedUrl: URL | undefined;
    let requestedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedUrl = new URL(String(input));
      requestedInit = init;
      return jsonResponse(homeResponse);
    };

    const content = await fetchHomeContent({
      version: "published",
      token: "public-sentinel",
      region: "ap",
      fetchImpl,
      cacheVersion: 123,
    });

    expect(content).toEqual({
      storyId: 42,
      storyUuid: "home-uuid",
      title: "kspf.studio",
      metaDescription: "Portfolio",
      intro: "Art Direction + Web Development",
    });
    expect(requestedUrl?.origin).toBe("https://api-ap.storyblok.com");
    expect(requestedUrl?.pathname).toBe("/v2/cdn/stories/home");
    expect(requestedUrl?.searchParams.get("version")).toBe("published");
    expect(requestedUrl?.searchParams.get("token")).toBe("public-sentinel");
    expect(requestedUrl?.searchParams.has("cv")).toBe(false);
    expect(requestedInit?.cache).toBe("no-store");
    expect(new Headers(requestedInit?.headers).get("Accept")).toBe("application/json");
  });

  it("fetches an uncached draft with the preview token and cache version", async () => {
    let requestedUrl: URL | undefined;
    let requestedInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestedUrl = new URL(String(input));
      requestedInit = init;
      return jsonResponse(homeResponse);
    };

    await fetchHomeContent({
      version: "draft",
      token: "preview-sentinel",
      region: "eu",
      fetchImpl,
      cacheVersion: 123,
    });

    expect(requestedUrl?.origin).toBe("https://api.storyblok.com");
    expect(requestedUrl?.searchParams.get("version")).toBe("draft");
    expect(requestedUrl?.searchParams.get("token")).toBe("preview-sentinel");
    expect(requestedUrl?.searchParams.get("cv")).toBe("123");
    expect(requestedInit?.cache).toBe("no-store");
  });

  it("names the missing credential for each content version", async () => {
    await expect(fetchHomeContent({ version: "published", token: "" })).rejects.toThrow(
      /STORYBLOK_PUBLIC_TOKEN/
    );
    await expect(fetchHomeContent({ version: "draft", token: "" })).rejects.toThrow(
      /STORYBLOK_PREVIEW_TOKEN/
    );
  });

  it("rejects unsupported regions before making a request", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error("network access should not occur");
    };

    await expect(
      fetchHomeContent({
        version: "published",
        token: "public-sentinel",
        region: "moon",
        fetchImpl,
      })
    ).rejects.toThrow(/Unsupported Storyblok region "moon"/);
  });

  it("reports delivery failures without exposing the credential-bearing URL", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("public-sentinel", { status: 401 });

    const error = await fetchHomeContent({
      version: "published",
      token: "public-sentinel",
      fetchImpl,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Storyblok 401.*home/);
    expect((error as Error).message).not.toContain("public-sentinel");
    expect((error as Error).message).not.toContain("api.storyblok.com");
  });

  it("redacts credential-bearing network errors", async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error(
        "GET https://api.storyblok.com/v2/cdn/stories/home?token=public-sentinel failed"
      );
    };

    const error = await fetchHomeContent({
      version: "published",
      token: "public-sentinel",
      fetchImpl,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Storyblok request failed.*home/);
    expect((error as Error).message).not.toContain("public-sentinel");
    expect((error as Error).message).not.toContain("api.storyblok.com");
  });

  it.each([
    ["missing story", {}],
    [
      "wrong component",
      {
        story: {
          ...homeResponse.story,
          content: { ...homeResponse.story.content, component: "page" },
        },
      },
    ],
    ["invalid story ID", { story: { ...homeResponse.story, id: "42" } }],
    ["missing story UUID", { story: { ...homeResponse.story, uuid: "" } }],
    [
      "invalid title",
      {
        story: {
          ...homeResponse.story,
          content: { ...homeResponse.story.content, title: null },
        },
      },
    ],
    [
      "invalid intro",
      {
        story: {
          ...homeResponse.story,
          content: { ...homeResponse.story.content, intro: null },
        },
      },
    ],
  ])("rejects a %s response", async (_label, body) => {
    const fetchImpl: typeof fetch = async () => jsonResponse(body);

    await expect(
      fetchHomeContent({
        version: "published",
        token: "public-sentinel",
        fetchImpl,
      })
    ).rejects.toThrow(/Storyblok home story/);
  });
});
