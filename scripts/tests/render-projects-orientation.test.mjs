import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { Window } from "happy-dom";

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
  assert.deepEqual(blocks.map(block => block.querySelector(".project__number")?.textContent), ["007", "02"]);
  assert.deepEqual([...blocks[0].children].map(node => node.className), ["project__number", "hero js-slideshow", "project__name", "project__category"]);
});
