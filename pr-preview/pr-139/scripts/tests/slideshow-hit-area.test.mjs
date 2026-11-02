import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { Window } from "happy-dom";

const loadSlideshowExports = async ({ homepage = false, viewportWidth = 1264 } = {}) => {
  const source = await readFile(new URL("../../slideshow.js", import.meta.url), "utf8");
  const module = { exports: {} };
  const document = {
    documentElement: { dataset: {}, clientWidth: viewportWidth, style: { setProperty() {} } },
    body: { dataset: { page: homepage ? "home" : "project" } },
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

test("slideshow controls remain positioned relative to the hero", async () => {
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

test("homepage arrows cover both halves of the viewport outside a narrow slide", async () => {
  const { positionHitArea } = await loadSlideshowExports({ homepage: true });
  const style = () => ({ values: {}, setProperty(name, value) { this.values[name] = value; } });
  const previous = { style: style() };
  const next = { style: style() };
  const hero = { getBoundingClientRect: () => ({ left: 240, top: 100 }) };
  const media = { getBoundingClientRect: () => ({ left: 390, top: 120, width: 500, height: 625 }) };

  positionHitArea(hero, media, previous, next);

  assert.equal(previous.style.values.left, "-240px", "left edge reaches the viewport, not the image");
  assert.equal(previous.style.values.width, "632px", "half the usable browser width excludes its scrollbar");
  assert.equal(next.style.values.left, "392px", "next begins at the browser midpoint");
  assert.equal(next.style.values.width, "632px");
  assert.equal(previous.style.values.top, "20px");
  assert.equal(previous.style.values.height, "625px", "navigation stays outside the vertical hit area");
});

test("homepage arrows reach the viewport edges at a mobile width", async () => {
  const { positionHitArea } = await loadSlideshowExports({ homepage: true, viewportWidth: 390 });
  const style = () => ({ values: {}, setProperty(name, value) { this.values[name] = value; } });
  const previous = { style: style() };
  const next = { style: style() };
  const hero = { getBoundingClientRect: () => ({ left: 15, top: 25 }) };
  const media = { getBoundingClientRect: () => ({ left: 15, top: 25, width: 360, height: 450 }) };
  positionHitArea(hero, media, previous, next);
  assert.equal(previous.style.values.left, "-15px");
  assert.equal(previous.style.values.width, "195px");
  assert.equal(next.style.values.left, "180px");
  assert.equal(next.style.values.width, "195px");
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

test("homepage arrow targets stop before side links and caption text", async () => {
  const { positionHitArea } = await loadSlideshowExports({ homepage: true });
  const style = () => ({ values: {}, setProperty(name, value) { this.values[name] = value; } });
  const previous = { style: style() };
  const next = { style: style() };
  const labels = [
    { getBoundingClientRect: () => ({ left: 1060, right: 1240, top: 380, bottom: 420, width: 180, height: 40 }) },
    { getBoundingClientRect: () => ({ left: 400, right: 880, top: 730, bottom: 770, width: 480, height: 40 }) },
  ];
  const hero = {
    getBoundingClientRect: () => ({ left: 240, top: 100 }),
    closest: () => ({ querySelectorAll: () => labels }),
  };
  const media = { getBoundingClientRect: () => ({ left: 390, right: 890, top: 120, bottom: 745, width: 500, height: 625 }) };
  positionHitArea(hero, media, previous, next);
  assert.equal(next.style.values.left, "392px");
  assert.equal(next.style.values.width, "420px", "right target ends eight pixels before the side label");
  assert.equal(previous.style.values.height, "602px", "targets end eight pixels before the lower caption");
  assert.equal(next.style.values.height, "602px");
});
