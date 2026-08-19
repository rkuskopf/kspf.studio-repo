import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPaths = [
  ".github/workflows/deploy.yml",
  ".github/workflows/preview.yml",
];

test("all gh-pages writers queue pending runs instead of cancelling them", async () => {
  for (const workflowPath of workflowPaths) {
    const workflowUrl = new URL(`../../${workflowPath}`, import.meta.url);
    const workflow = await readFile(workflowUrl, "utf8");
    const concurrency = workflow.match(/^concurrency:\n((?: {2}.+\n)+)/m)?.[1] ?? "";

    assert.match(concurrency, /^  group: gh-pages-branch$/m, workflowPath);
    assert.match(concurrency, /^  cancel-in-progress: false$/m, workflowPath);
    assert.match(concurrency, /^  queue: max$/m, workflowPath);
  }
});
