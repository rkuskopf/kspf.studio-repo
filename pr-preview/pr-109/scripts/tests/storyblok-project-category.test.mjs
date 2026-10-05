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
