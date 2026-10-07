import assert from "node:assert/strict";
import test from "node:test";

import { mapProjectStory } from "../storyblok-content.mjs";

const projectStory = (category) => ({
  name: "The Athenaeum",
  slug: "aesop",
  full_slug: "projects/aesop",
  content: {
    component: "project",
    title: "The Athenaeum",
    display_name: "The Athenaeum",
    category,
  },
});

test("maps rich-text category paragraphs to newline-separated plain text", () => {
  const category = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Aesop.com" },
          { type: "text", text: " – " },
        ],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "The Athenaeum" }],
      },
    ],
  };

  assert.equal(mapProjectStory(projectStory(category)).category, "Aesop.com –\nThe Athenaeum");
});

test("keeps legacy plain-text project categories working", () => {
  assert.equal(mapProjectStory(projectStory("Web Development")).category, "Web Development");
});

test("maps rich-text project titles without losing paragraph or hard breaks", () => {
  const story = projectStory("Web");
  story.content.display_name = {
    type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "Aesop" }, { type: "hard_break" }, { type: "text", text: "Athenaeum" }] },
      { type: "paragraph", content: [{ type: "text", text: "2026" }] },
    ],
  };
  assert.equal(mapProjectStory(story).displayName, "Aesop\nAthenaeum\n2026");
});

test("maps an editorial project number without losing leading zeroes", () => {
  const story = projectStory("Print");
  story.content.project_number = "007";
  assert.equal(mapProjectStory(story).projectNumber, "007");
  delete story.content.project_number;
  assert.equal(mapProjectStory(story).projectNumber, "");
});

test("maps an independent rich-text side caption with safe links", () => {
  const story = projectStory("Design");
  story.content.side_caption = { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "Visit", marks: [{ type: "link", attrs: { href: "https://example.com", target: "_blank" } }] },
  ] }] };
  const project = mapProjectStory(story);
  assert.equal(project.category, "Design");
  assert.equal(project.sideCaption, "Visit");
  assert.deepEqual(project.sideCaptionParts, [{ text: "Visit", href: "https://example.com", target: "_blank" }]);
});

test("missing and blank side captions leave legacy project data unchanged", () => {
  for (const value of [undefined, "", "  ", { type: "doc", content: [{ type: "paragraph", content: [] }] }]) {
    const story = projectStory("Design");
    story.content.side_caption = value;
    assert.equal("sideCaption" in mapProjectStory(story), false);
  }
});


test("slideshow counter is opt-in and independent of caption text", () => {
  for (const value of [undefined, false, "true", true]) {
    const project = mapProjectStory({ content: { component: "project", title: "Project", show_slideshow_counter: value } });
    assert.equal(project.showSlideshowCounter === true, value === true);
  }
});
