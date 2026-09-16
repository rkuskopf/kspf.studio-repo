import assert from "node:assert/strict";
import test from "node:test";
import { STORYBLOK_COMPONENTS } from "../storyblok-schema.mjs";

const byName = new Map(STORYBLOK_COMPONENTS.map((value) => [value.name, value]));

test("extends project without changing legacy fields", () => {
  const schema = byName.get("project").schema;
  assert.deepEqual(Object.keys(schema).slice(0, 9), [
    "title", "display_name", "category", "description", "view_url",
    "slides", "alt", "show_on_home", "order",
  ]);
  assert.equal(schema.page_enabled.default_value, "false");
  assert.deepEqual(schema.body.component_whitelist, ["project_header", "text", "media"]);
});

test("defines the initial project-page blocks", () => {
  assert.equal(byName.get("project_tag").schema.label.required, true);
  assert.deepEqual(byName.get("project_header").schema, {});
  assert.equal(byName.get("text").schema.content.type, "richtext");
  assert.equal(byName.get("media").schema.asset.allow_external_url, true);
  assert.equal(byName.get("media").schema.alt.required, undefined);
});
