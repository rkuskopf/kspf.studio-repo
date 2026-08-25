import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const prepareScript = new URL("../prepare-deployment.mjs", import.meta.url).pathname;

test("stamps one deterministic deployment revision across HTML assets and the live manifest", async (t) => {
  const targetDir = await mkdtemp(join(tmpdir(), "kspf-deployment-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  await mkdir(join(targetDir, "content"));
  await writeFile(
    join(targetDir, "index.html"),
    '<html><head><link rel="stylesheet" href="style.css?v=old"><link rel="stylesheet" href="https://use.typekit.net/kit.css"><script src="site-content.js" defer></script></head><body></body></html>',
    "utf8"
  );
  await writeFile(join(targetDir, "content/home.json"), '{"intro":"Published intro"}\n', "utf8");
  await writeFile(join(targetDir, "content/site.json"), '{"nav":{"homeLabel":"KSPF"}}\n', "utf8");
  await writeFile(join(targetDir, "projects.json"), '{"projects":[]}\n', "utf8");

  const sourceRevision = "1234567890abcdef1234567890abcdef12345678";
  await execFileAsync(process.execPath, [prepareScript, targetDir, sourceRevision]);

  const manifest = JSON.parse(await readFile(join(targetDir, "deployment.json"), "utf8"));
  const html = await readFile(join(targetDir, "index.html"), "utf8");

  assert.equal(manifest.sourceRevision, sourceRevision);
  assert.match(manifest.contentRevision, /^[a-f0-9]{64}$/);
  assert.equal(
    manifest.deploymentRevision,
    `${sourceRevision.slice(0, 12)}-${manifest.contentRevision.slice(0, 12)}`
  );
  assert.match(
    html,
    new RegExp(`<meta name="kspf-deployment-revision" content="${manifest.deploymentRevision}">`)
  );
  assert.match(html, new RegExp(`href="style\\.css\\?v=${manifest.deploymentRevision}"`));
  assert.match(html, new RegExp(`src="site-content\\.js\\?v=${manifest.deploymentRevision}"`));
  assert.match(html, /href="https:\/\/use\.typekit\.net\/kit\.css"/);

  await execFileAsync(process.execPath, [prepareScript, targetDir, sourceRevision]);
  const repeated = JSON.parse(await readFile(join(targetDir, "deployment.json"), "utf8"));
  assert.deepEqual(repeated, manifest);
});

test("changes the deployment revision when published Storyblok content changes", async (t) => {
  const targetDir = await mkdtemp(join(tmpdir(), "kspf-content-revision-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  await mkdir(join(targetDir, "content"));
  await writeFile(join(targetDir, "index.html"), "<html><head></head><body></body></html>", "utf8");
  await writeFile(join(targetDir, "content/home.json"), '{"intro":"First"}\n', "utf8");
  await writeFile(join(targetDir, "content/site.json"), '{}\n', "utf8");
  await writeFile(join(targetDir, "projects.json"), '{"projects":[]}\n', "utf8");

  const sourceRevision = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
  await execFileAsync(process.execPath, [prepareScript, targetDir, sourceRevision]);
  const before = JSON.parse(await readFile(join(targetDir, "deployment.json"), "utf8"));

  await writeFile(join(targetDir, "content/home.json"), '{"intro":"Second"}\n', "utf8");
  await execFileAsync(process.execPath, [prepareScript, targetDir, sourceRevision]);
  const after = JSON.parse(await readFile(join(targetDir, "deployment.json"), "utf8"));

  assert.notEqual(after.contentRevision, before.contentRevision);
  assert.notEqual(after.deploymentRevision, before.deploymentRevision);
});

test("does not rewrite preserved PR preview artifacts during a production deployment", async (t) => {
  const targetDir = await mkdtemp(join(tmpdir(), "kspf-preserve-previews-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  await mkdir(join(targetDir, "content"));
  await mkdir(join(targetDir, "pr-preview", "pr-80"), { recursive: true });
  await writeFile(join(targetDir, "index.html"), "<html><head></head><body></body></html>", "utf8");
  await writeFile(join(targetDir, "content/home.json"), '{}\n', "utf8");
  await writeFile(join(targetDir, "content/site.json"), '{}\n', "utf8");
  await writeFile(join(targetDir, "projects.json"), '{"projects":[]}\n', "utf8");
  const previewHtml =
    '<html><head><script src="site-content.js?v=preview-revision"></script></head></html>';
  const previewPath = join(targetDir, "pr-preview", "pr-80", "index.html");
  await writeFile(previewPath, previewHtml, "utf8");

  await execFileAsync(process.execPath, [
    prepareScript,
    targetDir,
    "3333333333333333333333333333333333333333",
  ]);

  assert.equal(await readFile(previewPath, "utf8"), previewHtml);
});

test("runs when the CLI script is reached through a symlinked workspace path", async (t) => {
  const targetDir = await mkdtemp(join(tmpdir(), "kspf-symlinked-cli-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  await mkdir(join(targetDir, "content"));
  await writeFile(join(targetDir, "index.html"), "<html><head></head><body></body></html>", "utf8");
  await writeFile(join(targetDir, "content/home.json"), '{}\n', "utf8");
  await writeFile(join(targetDir, "content/site.json"), '{}\n', "utf8");
  await writeFile(join(targetDir, "projects.json"), '{"projects":[]}\n', "utf8");

  const linkedScripts = join(targetDir, "linked-scripts");
  await symlink(dirname(prepareScript), linkedScripts, "dir");
  await execFileAsync(process.execPath, [
    join(linkedScripts, "prepare-deployment.mjs"),
    targetDir,
    "8888888888888888888888888888888888888888",
  ]);

  const manifest = JSON.parse(await readFile(join(targetDir, "deployment.json"), "utf8"));
  assert.equal(manifest.sourceRevision, "8888888888888888888888888888888888888888");
});
