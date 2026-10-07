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

test("static homepage rows use the portrait track without moving navigation", async () => {
  const { document, style, window } = await computedStyleFor(
    "../../style.css",
    '<header class="top"></header><div class="projects"><section class="project-block"></section></div>',
    ".project-block",
  );
  document.body.dataset.page = "home";

  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");
  assert.match(
    css,
    /--home-project-row-height:\s*calc\(var\(--portrait-width\) \* 1\.25\)/,
  );
  assert.match(
    css,
    /body\[data-page="home"\] \.projects\s*{[^}]*padding-block:\s*max\(0px, calc\(\(100dvh - var\(--home-project-row-height\)\) \/ 2\)\)/s,
  );
  assert.match(css, /\.projects\s*{[^}]*row-gap:\s*var\(--project-gap\)/s);
  assert.doesNotMatch(
    css,
    /body\[data-page="home"\] \.projects\s*{[^}]*row-gap:\s*0/s,
  );
  assert.match(
    css,
    /body\[data-page="home"\] \.project-block\s*{[^}]*grid-template-rows:\s*var\(--home-project-row-height\) auto/s,
  );
  assert.equal(style.minHeight, "0");
  assert.equal(style.scrollSnapAlign, "center");
  assert.equal(
    window.getComputedStyle(document.querySelector(".top")).top,
    "30px",
  );
  assert.doesNotMatch(css, /clamp\(560px, 80dvh, 800px\)/);
  assert.match(css, /body\[data-page="home"\]:has\(\.top\[hidden\]\) \.project-block:first-child \.hero\s*{[^}]*height:\s*calc\(var\(--portrait-width\) \* 1\.25\)/s, 'the first mobile frame reserves its final height before orientation probes finish');
});

test("Next.js homepage rows mirror the static portrait track", async () => {
  const { style } = await computedStyleFor(
    "../../next-app/app/globals.css",
    '<div class="homepage-projects"><section class="homepage-project"></section></div>',
    ".homepage-project",
  );

  const css = await readFile(
    new URL("../../next-app/app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /--homepage-project-row-height:\s*calc\(var\(--homepage-portrait-width\) \* 1\.25\)/,
  );
  assert.match(
    css,
    /\.homepage-projects\s*{[^}]*display:\s*grid[^}]*row-gap:\s*70px[^}]*padding-block:\s*max\(0px, calc\(\(100dvh - var\(--homepage-project-row-height\)\) \/ 2\)\)/s,
  );

  assert.match(
    css,
    /\.homepage-project\s*{[^}]*grid-template-rows:\s*var\(--homepage-project-row-height\) auto/s,
  );
  assert.equal(style.minHeight, "0");
  assert.equal(style.scrollSnapAlign, "center");
  assert.doesNotMatch(css, /clamp\(560px, 80dvh, 800px\)/);
});
