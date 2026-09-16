import { describe, expect, it } from "vitest";

import {
  fetchHomeContent,
  fetchHomepageProjects,
  fetchSiteContent,
} from "./delivery";

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
      initial_section: "info",
      show_navigation: false,
    },
  },
};

const siteResponse = {
  story: {
    id: 7,
    uuid: "site-uuid",
    name: "Site",
    slug: "site",
    full_slug: "site",
    content: {
      _uid: "site-content-uid",
      component: "site_settings",
      nav: [
        {
          _uid: "nav-uid",
          component: "nav_settings",
          home_label: "KSPF",
          home_href: { linktype: "url", url: "/" },
          information_label: "INFO",
          information_href: { linktype: "url", url: "#information" },
          show_about: true,
          close_label: "x",
        },
      ],
      information_overlay: [
        {
          _uid: "information-uid",
          component: "information_overlay",
          contact_title: "Contact",
          contact_body: "Melbourne\nAustralia",
          contact_email: "hello@kspf.au",
          services_title: "Services",
          services: [
            { _uid: "service-1", component: "text_item", text: "Web Development" },
            { _uid: "service-2", component: "text_item", text: "Creative Direction" },
          ],
        },
      ],
      profile: "An independent design practice.",
      footer: [],
    },
  },
};

const projectStory = ({
  id,
  slug,
  order,
  position,
  hidden = false,
  slides,
}: {
  id: number;
  slug: string;
  order?: number;
  position: number;
  hidden?: boolean;
  slides: unknown[];
}) => ({
  id,
  uuid: `${slug}-uuid`,
  name: slug,
  slug,
  full_slug: `projects/${slug}`,
  position,
  content: {
    _uid: `${slug}-content-uid`,
    component: "project",
    title: slug.toUpperCase(),
    display_name: slug === "arcteryx" ? "ARCTERYX" : "Second project",
    category: slug === "arcteryx" ? "Print" : "Web",
    slides,
    ...(hidden ? {} : { alt: `${slug} project preview` }),
    show_on_home: !hidden,
    ...(order === undefined ? {} : { order }),
  },
});

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
      initialSection: "info",
      showNavigation: false,
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

describe("homepage aggregate delivery records", () => {
  it("maps the site navigation and information hierarchy", async () => {
    let requestedUrl: URL | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = new URL(String(input));
      return jsonResponse(siteResponse);
    };

    const content = await fetchSiteContent({
      version: "published",
      token: "public-sentinel",
      region: "ap",
      fetchImpl,
    });

    expect(content).toEqual({
      storyId: 7,
      storyUuid: "site-uuid",
      nav: {
        homeLabel: "KSPF",
        homeHref: "/",
        informationLabel: "INFO",
        informationHref: "#information",
        showInformation: true,
      },
      information: {
        title: "KSPF",
        profile: "An independent design practice.",
        contactTitle: "Contact",
        contactBody: "Melbourne\nAustralia",
        contactEmail: "hello@kspf.au",
        servicesTitle: "Services",
        services: ["Web Development", "Creative Direction"],
      },
    });
    expect(requestedUrl?.pathname).toBe("/v2/cdn/stories/site");
    expect(requestedUrl?.searchParams.get("version")).toBe("published");
    expect(requestedUrl?.searchParams.get("token")).toBe("public-sentinel");
  });

  it("returns visible projects in configured order with asset and legacy slides", async () => {
    let requestedUrl: URL | undefined;
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = new URL(String(input));
      return jsonResponse({
        stories: [
          projectStory({
            id: 12,
            slug: "second",
            order: 2,
            position: 10,
            slides: [{
              _uid: "second-slide",
              component: "media_slide",
              legacy_url: "https://res.cloudinary.com/kspf/video/upload/second.mp4",
            }, {
              _uid: "second-local-slide",
              component: "media_slide",
              legacy_url: "assets/second.jpg",
            }],
          }),
          projectStory({
            id: 11,
            slug: "arcteryx",
            order: 1,
            position: 20,
            slides: [{
              _uid: "arcteryx-slide",
              component: "media_slide",
              asset: {
                filename: "https://a.storyblok.com/f/313862/arcteryx.jpg",
                content_type: "image/jpeg",
              },
            }],
          }),
          projectStory({
            id: 10,
            slug: "hidden",
            order: 0,
            position: 0,
            hidden: true,
            slides: [],
          }),
        ],
      });
    };

    const projects = await fetchHomepageProjects({
      version: "draft",
      token: "preview-sentinel",
      fetchImpl,
      cacheVersion: 456,
    });

    expect(projects).toEqual([
      {
        storyId: 11,
        storyUuid: "arcteryx-uuid",
        slug: "arcteryx",
        title: "ARCTERYX",
        displayName: "ARCTERYX",
        category: "Print",
        alt: "arcteryx project preview",
        order: 1,
        slides: [
          { url: "https://a.storyblok.com/f/313862/arcteryx.jpg", type: "image" },
        ],
      },
      {
        storyId: 12,
        storyUuid: "second-uuid",
        slug: "second",
        title: "SECOND",
        displayName: "Second project",
        category: "Web",
        alt: "second project preview",
        order: 2,
        slides: [
          {
            url: "https://res.cloudinary.com/kspf/video/upload/second.mp4",
            type: "video",
          },
          { url: "https://kspf.au/assets/second.jpg", type: "image" },
        ],
      },
    ]);
    expect(requestedUrl?.pathname).toBe("/v2/cdn/stories");
    expect(requestedUrl?.searchParams.get("starts_with")).toBe("projects/");
    expect(requestedUrl?.searchParams.get("version")).toBe("draft");
    expect(requestedUrl?.searchParams.get("cv")).toBe("456");
  });
});
