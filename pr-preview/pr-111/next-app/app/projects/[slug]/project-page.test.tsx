import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import type { ProjectPageData } from "../../../lib/storyblok/types";
import { ProjectPageView } from "./project-page";

const projectData = (
  overrides: Partial<ProjectPageData> = {}
): ProjectPageData => ({
  content: {
    storyId: 72,
    storyUuid: "project-uuid",
    slug: "product-design-tracer",
    title: "Product design tracer",
    displayName: "Product design tracer",
    category: "Product Design",
    description: "A minimal schema tracer.",
    showOnHome: false,
    metadata: { tags: [] },
    body: [{ _uid: "header-1", component: "project_header" }],
  },
  isPreview: false,
  ...overrides,
});

const render = (data: ProjectPageData) =>
  renderToStaticMarkup(createElement(ProjectPageView, { data }));

afterEach(() => {
  delete process.env.STORYBLOK_PUBLIC_TOKEN;
  delete process.env.STORYBLOK_PREVIEW_TOKEN;
});

describe("the mapped project page view", () => {
  it("renders the title without empty optional metadata or tag containers", () => {
    const markup = render(projectData());

    expect(markup).toContain("<h1>Product design tracer</h1>");
    expect(markup).not.toContain("<dl");
    expect(markup).not.toContain("project-page__tags");
  });

  it("renders supplied project metadata and ordered tags", () => {
    const data = projectData();
    data.content.metadata = {
      client: "KSPF",
      year: "2026",
      discipline: "Product design",
      tags: ["Tracer", "Prototype"],
    };

    const markup = render(data);

    expect(markup).toContain("<dt>Client</dt><dd>KSPF</dd>");
    expect(markup).toContain("<dt>Year</dt><dd>2026</dd>");
    expect(markup).toContain("<dt>Discipline</dt><dd>Product design</dd>");
    expect(markup.indexOf(">Tracer</li>")).toBeLessThan(
      markup.indexOf(">Prototype</li>")
    );
  });

  it("uses the SDK rich-text renderer and preserves exact mixed block order", () => {
    const data = projectData();
    data.content.body = [
      {
        _uid: "video-1",
        component: "media",
        asset: { url: "https://cdn.example.com/tracer.mp4", type: "video" },
      },
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
        asset: { url: "https://cdn.example.com/brand.png", type: "image" },
        alt: "KSPF brand mark",
        caption: "Image caption",
      },
    ];

    const markup = render(data);
    const blocks = Array.from(
      markup.matchAll(/data-project-block="([^"]+)"/g),
      (match) => match[1]
    );
    const video = markup.match(/<video[^>]*>/)?.[0] ?? "";

    expect(blocks).toEqual(["media", "project_header", "text", "media"]);
    expect(markup).toContain("<p>Tracer copy.</p>");
    expect(markup).toContain('alt="KSPF brand mark"');
    expect(video).toContain('src="https://cdn.example.com/tracer.mp4"');
    expect(video).toContain('controls=""');
    expect(video).toContain('playsInline=""');
    expect(video).toContain('preload="metadata"');
    expect(video).not.toContain("alt=");
    expect(markup).toContain("<figcaption>Image caption</figcaption>");
  });

  it.each([
    [false, "published"],
    [true, "draft"],
  ])("marks preview=%s content as %s", (isPreview, marker) => {
    expect(render(projectData({ isPreview }))).toContain(
      `data-storyblok-content="${marker}"`
    );
  });

  it("never serializes server-held Storyblok tokens into project markup", () => {
    process.env.STORYBLOK_PUBLIC_TOKEN = "public-project-render-sentinel";
    process.env.STORYBLOK_PREVIEW_TOKEN = "preview-project-render-sentinel";

    const markup = render(projectData({ isPreview: true }));

    expect(markup).not.toContain("public-project-render-sentinel");
    expect(markup).not.toContain("preview-project-render-sentinel");
  });
});
