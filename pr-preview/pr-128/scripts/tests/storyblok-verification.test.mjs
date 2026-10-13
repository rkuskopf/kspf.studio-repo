import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

test("the seed verifier accepts rich-text project titles", () => {
  const output = execFileSync(process.execPath, ["scripts/verify-storyblok.mjs"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  });
  assert.match(output, /storyblok verification: .* projects/);
});
