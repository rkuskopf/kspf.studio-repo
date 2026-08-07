const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashForView,
  normalizeView,
  shouldNormalizeHash,
  viewFromHash,
} = require("../panel-navigation.js");

test("maps supported hashes to panel views", () => {
  assert.equal(viewFromHash("#info"), "info");
  assert.equal(viewFromHash("#case-studies"), "case-studies");
  assert.equal(viewFromHash(""), "home");
  assert.equal(viewFromHash("#home"), "home");
});

test("falls back to home for unknown views and hashes", () => {
  assert.equal(normalizeView("other"), "home");
  assert.equal(viewFromHash("#other"), "home");
});

test("uses no hash for home", () => {
  assert.equal(hashForView("home"), "");
  assert.equal(hashForView("info"), "#info");
  assert.equal(hashForView("case-studies"), "#case-studies");
});

test("normalizes home and unknown hashes", () => {
  assert.equal(shouldNormalizeHash("#home"), true);
  assert.equal(shouldNormalizeHash("#other"), true);
  assert.equal(shouldNormalizeHash("#info"), false);
  assert.equal(shouldNormalizeHash("#case-studies"), false);
  assert.equal(shouldNormalizeHash(""), false);
});
