import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { HomePageData } from "../lib/storyblok/types";
import { HomeContentView } from "./page";

const publishedData: HomePageData = {
  content: {
    storyId: 42,
    storyUuid: "home-uuid",
    title: "Published KSPF",
    metaDescription: "Published portfolio",
    intro: "Published introduction",
    initialSection: "work",
    showNavigation: true,
  },
  site: {
    storyId: 7,
    storyUuid: "site-uuid",
    nav: {
      homeLabel: "KSPF",
      homeHref: "#work",
      informationLabel: "INFO",
      informationHref: "#information",
      showInformation: true,
    },
    information: {
      title: "KSPF",
      profile: "Independent design practice.",
      contactTitle: "Contact",
      contactBody: "Melbourne\nAustralia",
      contactEmail: "hello@kspf.au",
      servicesTitle: "Services",
      services: ["Web Development", "Creative Direction"],
    },
  },
  projects: [
    {
      storyId: 11,
      storyUuid: "arcteryx-uuid",
      slug: "arcteryx",
      title: "Arcteryx",
      displayName: "ARCTERYX",
      category: "Print",
      alt: "Arcteryx campaign preview",
      order: 1,
      slides: [
        { url: "https://example.com/arcteryx-1.jpg", type: "image" },
        { url: "https://example.com/arcteryx-2.jpg", type: "image" },
      ],
    },
    {
      storyId: 12,
      storyUuid: "second-uuid",
      slug: "second",
      title: "Second",
      displayName: "Second project",
      category: "Web",
      alt: "Second project preview",
      order: 2,
      slides: [{ url: "https://example.com/second.jpg", type: "image" }],
    },
  ],
  isPreview: false,
};

const render = (data: HomePageData) =>
  renderToStaticMarkup(createElement(HomeContentView, { data }));

afterEach(() => {
  delete process.env.STORYBLOK_PUBLIC_TOKEN;
  delete process.env.STORYBLOK_PREVIEW_TOKEN;
});

describe("the Storyblok-backed App Router route", () => {
  it("renders Information before Work with the current content hierarchy", () => {
    const markup = render(publishedData);

    expect(markup.indexOf('id="information"')).toBeLessThan(markup.indexOf('id="work"'));
    expect(markup).toContain('<h1 id="information-title">KSPF</h1>');
    expect(markup).toContain("Independent design practice.");
    expect(markup).toContain('href="mailto:hello@kspf.au"');
    expect(markup).toContain("Melbourne</span><span><br/>Australia");
    expect(markup).toContain("Web Development");
    expect(markup).toContain('data-storyblok-content="published"');
  });

  it("renders primary navigation and the first project metadata", () => {
    const markup = render(publishedData);

    expect(markup).toContain('<nav class="homepage-nav" aria-label="Primary">');
    expect(markup).toContain('href="#work">KSPF</a>');
    expect(markup).toContain("Published introduction");
    expect(markup).toContain('href="#information">INFO</a>');
    expect(markup).toContain("ARCTERYX");
    expect(markup).toContain("Print");
    expect(markup).toContain('aria-label="Previous ARCTERYX image"');
  });

  it("renders every project in order as labelled server content", () => {
    const markup = render(publishedData);

    expect(markup.indexOf("ARCTERYX")).toBeLessThan(markup.indexOf("Second project"));
    expect(markup.match(/class="homepage-project"/g)).toHaveLength(2);
    expect(markup).toContain('aria-labelledby="homepage-project-arcteryx-title"');
    expect(markup).toContain('aria-labelledby="homepage-project-second-title"');
    expect(markup).not.toContain('aria-live="polite"');
    expect(markup.indexOf('id="information"')).toBeLessThan(
      markup.indexOf('id="homepage-project-arcteryx-title"')
    );
    expect(markup).not.toContain("<footer");
  });

  it("renders typed draft home content through the same presentation path", () => {
    const markup = render({
      content: {
        ...publishedData.content,
        title: "Draft KSPF",
        intro: "Saved draft introduction",
      },
      site: publishedData.site,
      projects: publishedData.projects,
      isPreview: true,
    });

    expect(markup).toContain("Saved draft introduction");
    expect(markup).toContain('data-storyblok-content="draft"');
  });

  it("never serializes server-held Storyblok tokens into page markup", () => {
    process.env.STORYBLOK_PUBLIC_TOKEN = "public-render-sentinel";
    process.env.STORYBLOK_PREVIEW_TOKEN = "preview-render-sentinel";

    const markup = render({ ...publishedData, isPreview: true });

    expect(markup).not.toContain("public-render-sentinel");
    expect(markup).not.toContain("preview-render-sentinel");
  });
});
