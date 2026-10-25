import assert from "node:assert/strict";
import test from "node:test";
import { storyblokLabelParts } from "../storyblok-label-links.mjs";

const linkedText = (text, attrs) => ({ type: "text", text, marks: [{ type: "link", attrs }] });
const document = (...content) => ({ type: "doc", content });
const paragraph = (...content) => ({ type: "paragraph", content });

test("preserves linked and unlinked text, paragraphs and hard breaks", () => {
  assert.deepEqual(storyblokLabelParts(document(
    paragraph(linkedText("Aesop", { href: "https://aesop.com", target: "_blank" }), { type: "text", text: " archive" }),
    paragraph({ type: "text", text: "Print" }, { type: "hard_break" }, linkedText("Contact", { href: "studio@kspf.au", linktype: "email" })),
  )), [
    { text: "Aesop", href: "https://aesop.com", target: "_blank" },
    { text: " archive" }, { text: "\n" }, { text: "Print" }, { text: "\n" },
    { text: "Contact", href: "mailto:studio@kspf.au" },
  ]);
});

test("uses resolved Storyblok paths and anchors for internal links", () => {
  assert.deepEqual(storyblokLabelParts(document(paragraph(linkedText("Project", {
    href: "project-uuid", linktype: "story", anchor: "details", story: { full_slug: "projects/example", url: "projects/example" },
  })))), [{ text: "Project", href: "/projects/example#details" }]);
});

test("resolves internal UUIDs from the delivery response's links array", () => {
  assert.deepEqual(storyblokLabelParts(document(paragraph(linkedText("Project", {
    href: "project-uuid", uuid: "project-uuid", linktype: "story", anchor: "details",
  }))), [{ uuid: "project-uuid", url: "projects/example" }]), [{ text: "Project", href: "/projects/example#details" }]);
});

test("renders unsafe links as text and keeps safe neighbouring links", () => {
  for (const href of ["javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com", "https:\\example.com"]) {
    const parts = storyblokLabelParts(document(paragraph(linkedText("Unsafe", { href }), linkedText("Safe", { href: "/home" }))));
    assert.deepEqual(parts, [{ text: "Unsafe" }, { text: "Safe", href: "/home" }]);
  }
});

test("routes the Home story to the root and preserves its anchor", () => {
  for (const slug of ["home", "/home"]) {
    assert.deepEqual(storyblokLabelParts(document(paragraph(linkedText("Home", {
      href: "home-uuid", linktype: "story", story: { full_slug: slug },
    })))), [{ text: "Home", href: "/" }]);
    assert.deepEqual(storyblokLabelParts(document(paragraph(linkedText("About", {
      href: "home-uuid", linktype: "story", anchor: "information",
    }))), [{ uuid: "home-uuid", url: slug }]), [{ text: "About", href: "/#information" }]);
  }
});

test("plain text and unlinked documents keep the legacy data shape", () => {
  assert.equal(storyblokLabelParts("Existing title"), undefined);
  assert.equal(storyblokLabelParts(document(paragraph({ type: "text", text: "Existing title" }))), undefined);
});
