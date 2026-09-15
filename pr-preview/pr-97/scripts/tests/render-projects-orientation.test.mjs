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
