import assert from "node:assert/strict";
import test from "node:test";
import { homepageCaptions } from "../homepage-captions.mjs";
import { mapHomeStory } from "../storyblok-content.mjs";

test("caption defaults preserve existing content and unknown layouts fall back", () => {
  assert.deepEqual(homepageCaptions(), { layout: "current", showNumber: true, showTitle: true, showCategory: true, showCaption: true });
  assert.equal(homepageCaptions({caption_layout: "unknown"}).layout, "current");
});
test("homepage presets and visibility choices remain independent", () => {
  for (const layout of ["current", "flipped", "below", "below-flipped"]) {
    const captions = mapHomeStory({content: {component: "home_page", caption_layout: layout, show_project_numbers: false, show_image_captions: false}}).captions;
    assert.deepEqual(captions, { layout, showNumber: false, showTitle: true, showCategory: true, showCaption: false });
  }
});

test("saved Home settings hydrate before the home-ready signal", async () => {
  const { Window } = await import("happy-dom");
  const { readFile } = await import("node:fs/promises");
  const vm = await import("node:vm");
  const window = new Window();
  window.document.head.innerHTML = '<meta name="description">';
  let ready;
  window.kspfMarkHomeReady = () => { ready = window.document.documentElement.dataset.hideProjectNumber; };
  const content = mapHomeStory({content:{component:"home_page", caption_layout:"flipped", show_project_numbers:false}});
  vm.runInNewContext(await readFile(new URL("../../home-content.js", import.meta.url), "utf8"), {
    window, document:window.document, fetch:async () => ({ok:true,json:async()=>content}),
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(window.document.documentElement.dataset.captionLayout, "flipped");
  assert.equal(ready, "true");
  assert.equal(window.document.documentElement.dataset.hideProjectCaption, "false");
});
