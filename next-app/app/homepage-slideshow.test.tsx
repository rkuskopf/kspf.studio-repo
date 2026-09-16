import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { HomepageProject } from "../lib/storyblok/types";
import HomepageSlideshow, {
  isPortraitDimensions,
  nextSlideIndex,
} from "./homepage-slideshow";

const project: HomepageProject = {
  storyId: 11,
  storyUuid: "arcteryx-uuid",
  slug: "arcteryx",
  title: "Arcteryx",
  displayName: "ARCTERYX",
  category: "Print",
  alt: "Arcteryx campaign preview",
  order: 1,
  slides: [
    { url: "https://example.com/first.jpg", type: "image" },
    { url: "https://example.com/second.mp4", type: "video" },
  ],
};

const render = (value: HomepageProject) =>
  renderToStaticMarkup(createElement(HomepageSlideshow, { project: value }));

describe("homepage slideshow state", () => {
  it("wraps forwards and backwards without leaving the slide range", () => {
    expect(nextSlideIndex(0, -1, 2)).toBe(1);
    expect(nextSlideIndex(1, 1, 2)).toBe(0);
    expect(nextSlideIndex(0, 1, 0)).toBe(0);
  });

  it("classifies only genuinely portrait media for the shared 4:5 frame", () => {
    expect(isPortraitDimensions(800, 1000)).toBe(true);
    expect(isPortraitDimensions(1600, 1000)).toBe(false);
    expect(isPortraitDimensions(0, 1000)).toBe(false);
  });
});

describe("homepage slideshow presentation", () => {
  it("renders the first image with project alt text and labelled controls", () => {
    const markup = render(project);

    expect(markup).toContain('src="https://example.com/first.jpg"');
    expect(markup).toContain('alt="Arcteryx campaign preview"');
    expect(markup).toContain('aria-label="Previous image"');
    expect(markup).toContain('aria-label="Next image"');
  });

  it("renders a current video with inline muted looping playback attributes", () => {
    const markup = render({
      ...project,
      slides: [{ url: "https://example.com/first.mp4", type: "video" }],
    });

    expect(markup).toContain('src="https://example.com/first.mp4"');
    expect(markup).toContain("playsInline");
    expect(markup).toContain("loop");
    expect(markup).toContain("muted");
  });

  it("omits inactive controls when only one slide exists", () => {
    const markup = render({ ...project, slides: [project.slides[0]] });

    expect(markup).not.toContain('aria-label="Previous image"');
    expect(markup).not.toContain('aria-label="Next image"');
  });
});
