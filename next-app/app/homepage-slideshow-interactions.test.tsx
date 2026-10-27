// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import HomepageSlideshow from "./homepage-slideshow";
import type { HomepageProject } from "../lib/storyblok/types";

it.each([undefined, {number: 'left', title: 'right', category: 'bottom-left', caption: 'left'}] as const)("updates independent counters through arrow clicks, keyboard wrapping and touch swipes (%j)", async (positions) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const project: HomepageProject = {
    storyId: 1, storyUuid: "first", slug: "first", title: "First", displayName: "First",
    category: "Print", alt: "", order: 1, showSlideshowCounter: true,
    slides: [{ url: "/first.jpg", type: "image" }, { url: "/second.mp4", type: "video" }],
  };
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement("div", null,
      createElement(HomepageSlideshow, { project, positions, number: '001' }),
      createElement(HomepageSlideshow, { project: { ...project, storyId: 2, slides: [project.slides[0]] } }),
    )));
    const counter = () => container.querySelector(".homepage-project__slide-counter")?.getAttribute("aria-label");
    const hero = container.querySelector(".homepage-hero")!;
    if (positions) expect(container.querySelector('.homepage-project__slide-counter')?.closest('[data-caption-slot]')?.getAttribute('data-caption-slot')).toBe('left');
    await act(async () => (container.querySelector(".homepage-hero__hit--next") as HTMLButtonElement).click());
    expect(counter()).toBe("Slide 2 of 2");
    expect([...container.querySelectorAll(".homepage-project__slide-counter")].at(-1)?.textContent).toBe("001001");
    if (positions) expect(container.querySelector('[data-mobile-caption-slot="bottom-left"] .homepage-project__slide-counter')?.textContent).toBe('002002');
    await act(async () => hero.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
    expect(counter()).toBe("Slide 1 of 2");
    await act(async () => {
      hero.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 20, bubbles: true }));
      hero.dispatchEvent(new PointerEvent("pointerup", { pointerType: "touch", pointerId: 1, clientX: 40, clientY: 20, bubbles: true }));
    });
    expect(counter()).toBe("Slide 2 of 2");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
