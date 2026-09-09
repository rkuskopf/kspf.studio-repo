import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { Window } from "happy-dom";

const loadSlideshowExports = async () => {
  const source = await readFile(new URL("../../slideshow.js", import.meta.url), "utf8");
  const module = { exports: {} };
  const document = {
    documentElement: { dataset: {}, style: { setProperty() {} } },
    querySelectorAll() { return []; },
  };
  const window = {
    addEventListener() {},
    innerHeight: 720,
    innerWidth: 1280,
    requestAnimationFrame(callback) { callback(); return 1; },
  };

  vm.runInNewContext(source, { console, document, Image: class {}, module, window });
  return module.exports;
};

test("homepage slideshow controls stay inside the hero image frame", async () => {
  const window = new Window();
  const css = await readFile(new URL("../../style.css", import.meta.url), "utf8");

  window.document.head.innerHTML = `<style>${css}</style>`;
  window.document.body.dataset.page = "home";
  window.document.body.innerHTML = `
    <figure class="hero is-active">
      <button class="hero__hit hero__hit--prev"></button>
      <button class="hero__hit hero__hit--next"></button>
    </figure>
  `;

  const hero = window.document.querySelector(".hero");
  const previous = window.document.querySelector(".hero__hit--prev");
  const next = window.document.querySelector(".hero__hit--next");

  assert.equal(window.getComputedStyle(hero).position, "relative");
  assert.equal(window.getComputedStyle(previous).position, "absolute");
  assert.equal(window.getComputedStyle(previous).width, "50%");
  assert.equal(window.getComputedStyle(next).position, "absolute");
  assert.equal(window.getComputedStyle(next).width, "50%");
});

test("slideshow controls follow the rendered media width within a wider hero", async () => {
  const { positionHitArea } = await loadSlideshowExports();
  assert.equal(typeof positionHitArea, "function");

  const style = () => ({ values: {}, setProperty(name, value) { this.values[name] = value; } });
  const previous = { style: style() };
  const next = { style: style() };
  const hero = { getBoundingClientRect: () => ({ left: 240, top: 100 }) };
  const media = {
    getBoundingClientRect: () => ({ left: 390, top: 120, width: 500, height: 625 }),
  };

  positionHitArea(hero, media, previous, next);

  assert.deepEqual(previous.style.values, {
    bottom: "auto",
    height: "625px",
    left: "150px",
    right: "auto",
    top: "20px",
    width: "250px",
  });
  assert.deepEqual(next.style.values, {
    bottom: "auto",
    height: "625px",
    left: "400px",
    right: "auto",
    top: "20px",
    width: "250px",
  });
});
