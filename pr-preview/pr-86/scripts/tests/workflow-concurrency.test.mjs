import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

test("production deployment prepares a revisioned artifact and verifies the live Pages commit", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/deploy.yml", import.meta.url),
    "utf8"
  );

  assert.match(workflow, /^  pages: write$/m);
  assert.match(
    workflow,
    /node scripts\/prepare-deployment\.mjs \.gh-pages "\$GITHUB_SHA"/
  );
  assert.match(workflow, /^      - name: Commit and push deployment\n        id: publish$/m);
  assert.match(workflow, /commit=\$\(git rev-parse HEAD\)/);
  assert.match(workflow, /changed=true/);
  assert.match(workflow, /node scripts\/verify-pages-deployment\.mjs/);
  assert.match(workflow, /--commit "\$EXPECTED_PAGES_COMMIT"/);
  assert.match(workflow, /--source-revision "\$GITHUB_SHA"/);
  assert.match(workflow, /--deployment-revision "\$EXPECTED_DEPLOYMENT_REVISION"/);
  assert.match(workflow, /--request-build/);
});

test("production deployment fails when published Storyblok content cannot be fetched", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/deploy.yml", import.meta.url),
    "utf8"
  );
  const command = workflow.match(
    /- name: Pull published content from Storyblok[\s\S]*?^        run: (.+)$/m
  )?.[1];

  assert.ok(command, "production Storyblok sync command is missing");
  await assert.rejects(
    execFileAsync("bash", ["-eo", "pipefail", "-c", command], {
      cwd: new URL("../../", import.meta.url),
      env: {
        ...process.env,
        STORYBLOK_ACCESS_TOKEN: "",
        STORYBLOK_PUBLIC_TOKEN: "",
      },
    }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Missing Storyblok public token/);
      return true;
    }
  );
});

test("PR previews use the same revisioned Storyblok artifact preparation", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/preview.yml", import.meta.url),
    "utf8"
  );
  assert.match(workflow, /node scripts\/prerender\.mjs \./);
  assert.match(workflow, /node scripts\/prepare-deployment\.mjs \. "\$GITHUB_SHA"/);
});
