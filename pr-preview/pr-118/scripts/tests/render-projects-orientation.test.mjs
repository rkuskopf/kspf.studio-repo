import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { Window } from "happy-dom";
import { mapProjectStory } from "../storyblok-content.mjs";

test("renders mapped title/category links as safe anchors without interpreting HTML", async () => {
  const window = new Window({ url: "https://localhost:8001/" });
  window.document.body.innerHTML = '<div id="projects"></div>';
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");
  const doc = (text, href, target) => ({ type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text, marks: [{ type: "link", attrs: { href, target } }] },
  ] }] });
  const project = mapProjectStory({ content: { component: "project", title: "Title",
    display_name: doc("Aesop <archive>", "https://aesop.com", "_blank"),
    category: doc("Contact", "mailto:studio@kspf.au"),
  } });
  vm.runInNewContext(source, { document: window.document, window, console,
    fetch: async () => ({ ok: true, json: async () => ({ projects: [project] }) }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  const titleLink = window.document.querySelector(".project__name a");
  assert.equal(titleLink.getAttribute("href"), "https://aesop.com");
  assert.equal(titleLink.textContent, "Aesop <archive>");
  assert.equal(titleLink.getAttribute("target"), "_blank");
  assert.equal(titleLink.getAttribute("rel"), "noopener noreferrer");
  assert.equal(window.document.querySelector(".project__category a").getAttribute("href"), "mailto:studio@kspf.au");
  assert.equal(window.document.querySelector("archive"), null);
});

test("does not activate unsafe links from locally edited project JSON", async () => {
  const window = new Window();
  window.document.body.innerHTML = '<div id="projects"></div>';
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");
  vm.runInNewContext(source, { document: window.document, window, console,
    fetch: async () => ({ ok: true, json: async () => ({ projects: [{ title: "Title",
      displayNameParts: [{ text: "Unsafe", href: "javascript:alert(1)" }],
      categoryParts: [{ text: "Safe", href: "#information" }],
    }] }) }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(window.document.querySelector(".project__name a"), null);
  assert.equal(window.document.querySelector(".project__name").textContent, "Unsafe");
  assert.equal(window.document.querySelector(".project__category a").getAttribute("href"), "#information");
});

test("project media stays hidden until slideshow orientation is classified", async () => {
  const window = new Window({ url: "https://localhost:8001/" });
  const { document } = window;
  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");

  document.head.innerHTML = `<style>${css}</style>`;
  document.body.dataset.page = "home";
  document.body.innerHTML = '<div id="projects" class="projects"></div>';

  window.kspfContentUrl = (path) => path;
  window.kspfMarkHomeReady = () => {};
  const fetch = async () => ({
    ok: true,
    async json() {
      return {
        projects: [{
          title: "Portrait project",
          category: "Print",
          slides: ["/portrait.jpg"],
        }],
      };
    },
  });

  vm.runInNewContext(source, { console, document, fetch, window });
  await new Promise((resolve) => setImmediate(resolve));

  const media = document.querySelector(".project-block .hero__img");
  assert.ok(media);
  assert.equal(media.classList.contains("is-orientation-pending"), true);
  assert.equal(window.getComputedStyle(media).visibility, "hidden");
});

test("project category preserves mapped rich-text line breaks", async () => {
  const window = new Window({ url: "https://localhost:8001/" });
  const { document } = window;
  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");

  document.head.innerHTML = `<style>${css}</style>`;
  document.body.dataset.page = "home";
  document.body.innerHTML = '<div id="projects" class="projects"></div>';

  window.kspfContentUrl = (path) => path;
  window.kspfMarkHomeReady = () => {};
  const fetch = async () => ({
    ok: true,
    async json() {
      return {
        projects: [{
          title: "The Athenaeum",
          category: "Aesop.com –\nThe Athenaeum",
          slides: ["/portrait.jpg"],
        }],
      };
    },
  });

  vm.runInNewContext(source, { console, document, fetch, window });
  await new Promise((resolve) => setImmediate(resolve));

  const category = document.querySelector(".project__category");
  assert.ok(category);
  assert.equal(category.textContent, "Aesop.com –\nThe Athenaeum");
  assert.equal(window.getComputedStyle(category).whiteSpace, "pre-line");
});

test("numbers visible projects and places the title after media", async () => {
  const window = new Window();
  window.document.body.innerHTML = '<div id="projects"></div>';
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");
  const projects = [
    { title: "Hidden", showOnHome: false },
    { title: "First", projectNumber: "007", slides: [] },
    { title: "Second", projectNumber: "  ", slides: [] },
  ];
  vm.runInNewContext(source, {
    document: window.document, window, console,
    fetch: async () => ({ ok: true, json: async () => ({ projects }) }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  const blocks = [...window.document.querySelectorAll(".project-block")];
  assert.deepEqual(blocks.map(block => block.querySelector(".project__number")?.textContent), ["007", "002"]);
  assert.deepEqual([...blocks[0].children].map(node => node.className), ["project__number", "hero js-slideshow", "project__caption"]);
  assert.deepEqual([...blocks[0].querySelector(".project__caption").children].map(node => node.className), ["project__name", "project__caption-right"]);
});


test("counter replaces the optional caption and pads numeric project labels", async () => {
  const window = new Window();
  window.document.body.innerHTML = '<div id="projects"></div>';
  const source = await readFile(new URL("../../render-projects.js", import.meta.url), "utf8");
  const projects = [
    { title: "Counter", projectNumber: "7", showSlideshowCounter: true, sideCaption: "Hidden text", category: "Print", slides: ["/a.jpg", "/b.mp4"] },
    { title: "Text", projectNumber: "A1", sideCaption: "Visible text", slides: ["/a.jpg"] },
  ];
  vm.runInNewContext(source, { document: window.document, window, console,
    fetch: async () => ({ ok: true, json: async () => ({ projects }) }),
  });
  await new Promise(resolve => setImmediate(resolve));
  const blocks = [...window.document.querySelectorAll(".project-block")];
  assert.equal(blocks[0].querySelector(".project__number").textContent, "007");
  assert.equal(blocks[1].querySelector(".project__number").textContent, "A1");
  assert.equal(blocks[0].querySelector(".project__slide-current").textContent, "001");
  assert.equal(blocks[0].querySelector(".project__slide-total").textContent, "002");
  assert.equal(blocks[0].querySelector(".project__slide-counter").getAttribute("aria-label"), "Slide 1 of 2");
  assert.equal(blocks[0].textContent.includes("Hidden text"), false);
  assert.equal(blocks[0].querySelector(".project__category").textContent, "Print");
  assert.equal(blocks[1].querySelector(".project__side-caption").textContent, "Visible text");
  assert.equal(blocks[1].querySelector(".project__slide-counter"), null);
});

test("slideshow navigation updates only its own counter and wraps across video slides", async () => {
  const window = new Window({ url: "https://localhost:8001/" });
  window.document.body.innerHTML = '<div id="projects"></div>';
  const context = vm.createContext({ window, document: window.document, console, Image: window.Image,
    IntersectionObserver: class { observe() {} },
    fetch: async () => ({ ok: true, json: async () => ({ projects: [
      { title: "First", showSlideshowCounter: true, slides: ["/a.jpg", "/b.mp4"] },
      { title: "Second", showSlideshowCounter: true, slides: ["/a.jpg"] },
    ] }) }),
  });
  window.requestAnimationFrame = () => 1;
  window.setTimeout = () => 1;
  vm.runInContext(await readFile(new URL("../../slideshow.js", import.meta.url), "utf8"), context);
  vm.runInContext(await readFile(new URL("../../render-projects.js", import.meta.url), "utf8"), context);
  await new Promise(resolve => setImmediate(resolve));
  const blocks = [...window.document.querySelectorAll(".project-block")];
  const current = index => blocks[index].querySelector(".project__slide-current").textContent;
  blocks[0].querySelector(".hero__hit--next").click();
  assert.equal(current(0), "002");
  assert.equal(current(1), "001");
  blocks[0].querySelector(".hero__hit--next").click();
  assert.equal(current(0), "001");
  blocks[0].querySelector(".hero").dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft" }));
  assert.equal(current(0), "002");
  const hero = blocks[0].querySelector(".hero");
  hero.dispatchEvent(new window.PointerEvent("pointerdown", { pointerType: "touch", pointerId: 1, clientX: 120, clientY: 20 }));
  hero.dispatchEvent(new window.PointerEvent("pointermove", { pointerType: "touch", pointerId: 1, clientX: 40, clientY: 20, cancelable: true }));
  assert.equal(current(0), "001");
  hero.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowLeft" }));
  assert.equal(blocks[0].querySelector(".project__slide-counter").getAttribute("aria-label"), "Slide 2 of 2");
  await window.happyDOM.abort();
});
