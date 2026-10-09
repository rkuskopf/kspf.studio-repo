import { mapTypography } from "../lib/typography/settings";
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
    typography: mapTypography(undefined),
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
      category: "Print\nCampaign",
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
  it("renders links in both captions, preserves breaks, and escapes their text", () => {
    const data = structuredClone(publishedData);
    data.projects[0].displayNameParts = [{ text: "Aesop <archive>", href: "https://aesop.com", target: "_blank" }];
    data.projects[0].categoryParts = [{ text: "Print\n" }, { text: "Contact", href: "mailto:studio@kspf.au" }];
    const markup = render(data);
    expect(markup).toContain('<a href="https://aesop.com" target="_blank" rel="noopener noreferrer">Aesop &lt;archive&gt;</a>');
    expect(markup).toContain('<a href="mailto:studio@kspf.au">Contact</a>');
    expect(markup).toContain("<br/>");
  });
  it("preserves editorial title line breaks beside the category", () => {
    const data = structuredClone(publishedData);
    data.projects[0].displayName = "Aesop\nAthenaeum";
    const markup = render(data);
    expect(markup).toContain('class="homepage-project__caption"');
    expect(markup).toContain('<span>Aesop</span><span><br/>Athenaeum</span>');
  });
  it("renders explicit numbers and falls back to visible feed position", () => {
    const data = structuredClone(publishedData);
    data.projects[0].projectNumber = "007";
    data.projects[1].projectNumber = "  ";
    const markup = render(data);
    expect(markup).toContain('class="homepage-project__number">007</p>');
    expect(markup).toContain('class="homepage-project__number">002</p>');
    expect(render(publishedData)).toContain('class="homepage-project__number">001</p>');
  });
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
    expect(markup).toContain("<span>Print</span><span><br/>Campaign</span>");
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
    expect(markup.indexOf("homepage-hero")).toBeLessThan(
      markup.indexOf("homepage-project__name")
    );
    expect(markup.indexOf("homepage-hero")).toBeLessThan(
      markup.indexOf("homepage-project__category")
    );
  });

  it("omits the optional navigation intro when it is blank", () => {
    const markup = render({
      ...publishedData,
      content: { ...publishedData.content, intro: "" },
    });

    expect(markup).not.toContain("homepage-nav__intro");
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


it("exposes global layout and visibility settings while keeping slideshows available", () => {
  const data = structuredClone(publishedData);
  data.content.captions = { layout: "flipped", showNumber: false, showTitle: true, showCategory: false, showCaption: true };
  const markup = render(data);
  expect(markup).toContain('data-caption-layout="flipped"');
  expect(markup).toContain('data-hide-project-number="true"');
  expect(markup).toContain('data-hide-project-category="true"');
  expect(markup).toContain('data-hide-project-caption="false"');
  expect(markup).toContain('class="homepage-hero"');
});

it("renders global navigation tokens and a weight-only per-link override", () => {
  const data = structuredClone(publishedData);
  data.site.typography.navigation = { ...data.site.typography.navigation, fontFamily: "sans", fontWeight: 700, desktopSize: 20, mobileSize: 16 };
  data.site.nav.homeFontWeight = 400;
  const markup = renderToStaticMarkup(createElement(HomeContentView, { data }));
  expect(markup).toContain("--type-navigation-weight:700");
  expect(markup).toContain("--type-navigation-family:Helvetica, Arial, sans-serif");
  expect(markup).toContain('class="homepage-nav__home" style="font-weight:400"');
  expect(markup).toContain('class="homepage-nav__information" href="#information"');
});
