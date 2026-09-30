import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";

async function computedStyleFor(cssPath, bodyMarkup, selector, bodyClass = "") {
  const window = new Window({ url: "https://localhost:8001/" });
  const { document } = window;
  const css = await readFile(new URL(cssPath, import.meta.url), "utf8");

  document.head.innerHTML = `<style>${css}</style>`;
  document.body.className = bodyClass;
  document.body.innerHTML = bodyMarkup;

  return {
    document,
    style: window.getComputedStyle(document.querySelector(selector)),
    window,
  };
}

test("static homepage rows use a fixed track with symmetric guided scrolling", async () => {
  const { document, style, window } = await computedStyleFor(
    "../../style.css",
    '<header class="top"></header><section class="project-block"></section>',
    ".project-block",
  );
  document.body.dataset.page = "home";

  const rootStyle = window.getComputedStyle(document.documentElement);
  assert.equal(rootStyle.scrollSnapType, "y mandatory");
  assert.equal(
    rootStyle.scrollPaddingTop,
    "max(0px, calc((100dvh - clamp(560px, 80dvh, 800px)) / 2))",
  );
  assert.equal(style.height, "800px");
  assert.equal(style.minHeight, "0");
  assert.equal(style.scrollSnapAlign, "start");
  assert.equal(
    window.getComputedStyle(document.querySelector(".top")).top,
    "-70px",
  );
});

test("Next.js homepage rows use the same fixed desktop track", async () => {
  const { style } = await computedStyleFor(
    "../../next-app/app/globals.css",
    '<section class="homepage-project"></section>',
    ".homepage-project",
  );

  assert.equal(style.height, "800px");
  assert.equal(style.minHeight, "0");
  assert.equal(style.scrollSnapAlign, "start");
});
