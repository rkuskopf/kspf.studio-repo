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

const siteResponse = {
  story: {
    id: 7,
    uuid: "site-uuid",
    content: {
      component: "site_settings",
      nav: [{
        component: "nav_settings",
        home_label: "KSPF",
        home_href: { url: "/" },
        information_label: "INFO",
        information_href: { url: "#information" },
        show_about: true,
      }],
      information_overlay: [{
        component: "information_overlay",
        contact_title: "Contact",
        contact_body: "",
        contact_email: "hello@kspf.au",
        services_title: "Services",
        services: [{ component: "text_item", text: "Web Development" }],
      }],
      profile: "Independent design practice.",
    },
  },
};

const projectsResponse = {
  stories: [
    {
      id: 12,
      uuid: "second-uuid",
      slug: "second",
      full_slug: "projects/second",
      position: 2,
      content: {
        component: "project",
        title: "Second",
        display_name: "Second",
        category: "Web",
        alt: "Second preview",
        order: 2,
        show_on_home: true,
        slides: [{
          component: "media_slide",
          asset: { filename: "https://example.com/second.jpg", content_type: "image/jpeg" },
        }],
      },
    },
    {
      id: 11,
      uuid: "arcteryx-uuid",
      slug: "arcteryx",
      full_slug: "projects/arcteryx",
      position: 1,
      content: {
        component: "project",
        title: "Arcteryx",
        display_name: "ARCTERYX",
        category: "Print",
        alt: "Arcteryx preview",
        order: 1,
        show_on_home: true,
        slides: [{
          component: "media_slide",
          asset: { filename: "https://example.com/arcteryx.jpg", content_type: "image/jpeg" },
        }],
      },
    },
  ],
};

const requestRecorder = (projectPayload: unknown = projectsResponse, homePayload: unknown = homeResponse) => {
  const requests: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    const payload = url.pathname.endsWith("/stories/home")
      ? homePayload
      : (url.pathname.endsWith("/stories/site") || url.searchParams.get("find_by") === "uuid")
        ? siteResponse
        : projectPayload;
    return new Response(JSON.stringify(payload), {
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
    expect(data.site.nav.homeLabel).toBe("KSPF");
    expect(data.projects.map((project) => project.displayName)).toEqual([
      "ARCTERYX",
      "Second",
    ]);
    expect(requests).toHaveLength(3);
    expect(requests.every((request) => request.searchParams.get("version") === "published"))
      .toBe(true);
    expect(requests.every((request) => request.searchParams.get("token") === "public-sentinel"))
      .toBe(true);
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
    expect(requests).toHaveLength(3);
    expect(requests.every((request) => request.searchParams.get("version") === "draft"))
      .toBe(true);
    expect(requests.every((request) => request.searchParams.get("token") === PREVIEW_TOKEN))
      .toBe(true);
    expect(requests.every((request) => request.searchParams.get("cv") === String(NOW)))
      .toBe(true);
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
    expect(requests).toHaveLength(3);
    expect(requests.every((request) => request.searchParams.get("version") === "published"))
      .toBe(true);
    expect(requests.every((request) => request.searchParams.get("token") === "public-sentinel"))
      .toBe(true);
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

  it("fails clearly when Storyblok has no visible homepage projects", async () => {
    const { fetchImpl } = requestRecorder({ stories: [] });

    await expect(
      loadHomePage({
        searchParams: {},
        environment: {
          NODE_ENV: "development",
          STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
        },
        fetchImpl,
        now: NOW,
      })
    ).rejects.toThrow("Storyblok homepage has no visible projects.");
  });
});

it('resolves shared Site references once with matching draft version', async () => {
  const home = structuredClone(homeResponse) as any;
  home.story.content.body = [
    {_uid:'work',component:'project_feed',collection:'projects/'},
    {_uid:'nav',component:'navigation',site:'site-uuid'},
    {_uid:'info',component:'information',site:'site-uuid'},
  ];
  const {requests,fetchImpl} = requestRecorder(projectsResponse,home);
  const data = await loadHomePage({searchParams:signedParams(),environment:{NODE_ENV:'development',STORYBLOK_PREVIEW_TOKEN:PREVIEW_TOKEN},fetchImpl,now:NOW});
  expect(data.content.body?.map(block => block.component)).toEqual(['project_feed','navigation','information']);
  expect(requests.filter(url => url.searchParams.get('find_by') === 'uuid')).toHaveLength(1);
  expect(requests.every(url => url.searchParams.get('version') === 'draft')).toBe(true);
  expect(data.sites?.['site-uuid']).toEqual(data.site);
});
it('rejects an explicitly empty body instead of silently falling back', async () => {
  const home = structuredClone(homeResponse) as any; home.story.content.body=[];
  const {fetchImpl} = requestRecorder(projectsResponse,home);
  await expect(loadHomePage({searchParams:{},environment:{STORYBLOK_PUBLIC_TOKEN:'public'},fetchImpl})).rejects.toThrow(/home body/);
});
it('rejects a mismatched Site reference', async () => {
  const home = structuredClone(homeResponse) as any;
  home.story.content.body = [
    {_uid:'work',component:'project_feed',collection:'projects/'},
    {_uid:'nav',component:'navigation',site:'missing-uuid'},
    {_uid:'info',component:'information',site:'missing-uuid'},
  ];
  const {fetchImpl} = requestRecorder(projectsResponse,home);
  await expect(loadHomePage({searchParams:{},environment:{STORYBLOK_PUBLIC_TOKEN:'public'},fetchImpl})).rejects.toThrow(/requested reference/);
});

it('resolves two distinct canonical Site stories without fetching the legacy singleton', async () => {
  const home = structuredClone(homeResponse) as any;
  home.story.content.body = [
    {_uid:'info',component:'information',site:'site-uuid'},
    {_uid:'nav',component:'navigation',site:'other-site'},
    {_uid:'work',component:'project_feed',collection:'projects/'},
  ];
  const requests: URL[]=[];
  const fetchImpl: typeof fetch=async input => {
    const url=new URL(String(input));requests.push(url);
    let payload: unknown=projectsResponse;
    if(url.pathname.endsWith('/stories/home')) payload=home;
    else if(url.searchParams.get('find_by')==='uuid') {
      const site=structuredClone(siteResponse);
      site.story.uuid=url.pathname.endsWith('/other-site')?'other-site':'site-uuid';
      payload=site;
    }
    return new Response(JSON.stringify(payload),{status:200});
  };
  const data=await loadHomePage({searchParams:{},environment:{STORYBLOK_PUBLIC_TOKEN:'public'},fetchImpl});
  expect(Object.keys(data.sites || {})).toEqual(['site-uuid','other-site']);
  expect(requests).toHaveLength(4);
  expect(requests.some(url=>url.pathname.endsWith('/stories/site'))).toBe(false);
});
it.each([404,200])('rejects missing or wrong-type Site story (status %s)', async status => {
  const home=structuredClone(homeResponse) as any;
  home.story.content.body=[{_uid:'info',component:'information',site:'site-uuid'},{_uid:'nav',component:'navigation',site:'site-uuid'},{_uid:'work',component:'project_feed',collection:'projects/'}];
  const fetchImpl:typeof fetch=async input=> {
    const url=new URL(String(input));
    if(url.searchParams.get('find_by')==='uuid') return new Response(JSON.stringify({story:{id:7,uuid:'site-uuid',content:{component:'project'}}}),{status});
    return new Response(JSON.stringify(url.pathname.endsWith('/stories/home')?home:projectsResponse));
  };
  await expect(loadHomePage({searchParams:{},environment:{STORYBLOK_PUBLIC_TOKEN:'public'},fetchImpl})).rejects.toThrow(status===404?/404/:/site_settings/);
});
