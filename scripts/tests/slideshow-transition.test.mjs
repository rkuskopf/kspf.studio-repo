import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const loadSlideshowExports = async () => {
  const source = await readFile(new URL("../../slideshow.js", import.meta.url), "utf8");
  const module = { exports: {} };
  const document = {
    documentElement: {
      dataset: {},
      style: { setProperty() {} },
    },
    querySelectorAll() {
      return [];
    },
  };
  const window = {
    addEventListener() {},
    innerHeight: 720,
    innerWidth: 1280,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
  };

  vm.runInNewContext(source, {
    console,
    document,
    Image: class {},
    module,
    window,
  });
  return module.exports;
};

const mediaElement = () => {
  const classes = new Set();
  return {
    classes,
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
  };
};

test("outgoing portrait media stays capped while landscape media fades in", async () => {
  const { createMediaPortraitUpdater } = await loadSlideshowExports();
  assert.equal(
    typeof createMediaPortraitUpdater,
    "function",
    "slideshow must classify orientation on each media element"
  );

  const updateOrientation = createMediaPortraitUpdater(async (src) =>
    src === "portrait.mp4" ? 0.75 : 1.6
  );
  const outgoingPortrait = mediaElement();
  const incomingLandscape = mediaElement();

  await updateOrientation(outgoingPortrait, "portrait.mp4");
  await updateOrientation(incomingLandscape, "landscape.png");

  assert.equal(outgoingPortrait.classes.has("is-portrait"), true);
  assert.equal(incomingLandscape.classes.has("is-portrait"), false);
});
