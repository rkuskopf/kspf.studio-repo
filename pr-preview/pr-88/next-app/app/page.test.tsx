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
  },
  isPreview: false,
};

const render = (data: HomePageData) =>
  renderToStaticMarkup(createElement(HomeContentView, { data }));

afterEach(() => {
  delete process.env.STORYBLOK_PUBLIC_TOKEN;
  delete process.env.STORYBLOK_PREVIEW_TOKEN;
});

describe("the Storyblok-backed App Router route", () => {
  it("renders typed published home content", () => {
    const markup = render(publishedData);

    expect(markup).toContain("<h1>Published KSPF</h1>");
    expect(markup).toContain("Published introduction");
    expect(markup).toContain('data-storyblok-content="published"');
  });

  it("renders typed draft home content through the same presentation path", () => {
    const markup = render({
      content: {
        ...publishedData.content,
        title: "Draft KSPF",
        intro: "Saved draft introduction",
      },
      isPreview: true,
    });

    expect(markup).toContain("<h1>Draft KSPF</h1>");
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
