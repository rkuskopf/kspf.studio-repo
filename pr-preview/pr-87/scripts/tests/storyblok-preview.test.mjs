import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const previewModuleUrl = new URL("../storyblok-preview-server.mjs", import.meta.url);

test("maps Storyblok story routes to the site's existing HTML documents", async () => {
  const preview = await import(previewModuleUrl).catch(() => ({}));
  assert.equal(
    typeof preview.resolvePreviewDocument,
    "function",
    "preview server must expose route resolution"
  );

  const cases = [
    ["/", "index.html"],
    ["/home", "index.html"],
    ["/site", "index.html"],
    ["/projects/the-athenaeum", "index.html"],
    ["/experience", "experience.html"],
    ["/case-studies/case-study-aesop", "case-study-aesop.html"],
    ["/unknown-story", null],
  ];

  cases.forEach(([pathname, expected]) => {
    assert.equal(preview.resolvePreviewDocument(pathname), expected, pathname);
  });
});

test("serves public site assets without exposing dotfiles or repository internals", async () => {
  const preview = await import(previewModuleUrl);
  assert.equal(
    typeof preview.resolveStaticFile,
    "function",
    "preview server must expose safe static-file resolution"
  );

  const root = "/tmp/kspf-preview-root";
  assert.equal(preview.resolveStaticFile(root, "/style.css"), join(root, "style.css"));
  assert.equal(
    preview.resolveStaticFile(root, "/assets/uploads/ath-1.mp4"),
    join(root, "assets/uploads/ath-1.mp4")
  );
  assert.equal(
    preview.resolveStaticFile(root, "/scripts/storyblok-preview-client.js"),
    join(root, "scripts/storyblok-preview-client.js")
  );
  assert.equal(preview.resolveStaticFile(root, "/.env"), null);
  assert.equal(preview.resolveStaticFile(root, "/../.env"), null);
  assert.equal(preview.resolveStaticFile(root, "/%2e%2e/.env"), null);
  assert.equal(preview.resolveStaticFile(root, "/scripts/setup-storyblok.mjs"), null);
  assert.equal(preview.resolveStaticFile(root, "/docs/storyblok-setup.md"), null);
});

test("injects the secure preview base and Storyblok Bridge once", async () => {
  const preview = await import(previewModuleUrl);
  assert.equal(
    typeof preview.injectStoryblokPreview,
    "function",
    "preview server must expose HTML preview injection"
  );

  const source = "<!doctype html><html><head><title>KSPF</title></head><body></body></html>";
  const injected = preview.injectStoryblokPreview(source);
  const reinjected = preview.injectStoryblokPreview(injected);

  assert.match(injected, /<base href="\/">/);
  assert.match(injected, /https:\/\/app\.storyblok\.com\/f\/storyblok-v2-latest\.js/);
  assert.match(injected, /\/scripts\/storyblok-preview-client\.js/);
  assert.equal((reinjected.match(/storyblok-v2-latest\.js/g) || []).length, 1);
  assert.equal((reinjected.match(/<base href="\/">/g) || []).length, 1);
});

test("keeps the last valid draft snapshot when a refresh fails", async () => {
  const preview = await import(previewModuleUrl);
  assert.equal(
    typeof preview.DraftContentStore,
    "function",
    "preview server must expose its in-memory draft store"
  );

  let loadCount = 0;
  const firstSnapshot = new Map([["content/home.json", { title: "Saved draft" }]]);
  const store = new preview.DraftContentStore({
    loadSnapshot: async () => {
      loadCount += 1;
      if (loadCount === 1) return firstSnapshot;
      throw new Error("Storyblok unavailable");
    },
  });

  assert.equal((await store.getSnapshot()).get("content/home.json").title, "Saved draft");
  await assert.rejects(store.refresh(), /Storyblok unavailable/);
  assert.equal(store.current.get("content/home.json").title, "Saved draft");
});

test("serves in-memory draft JSON without changing the tracked snapshot", async (t) => {
  const preview = await import(previewModuleUrl);
  assert.equal(
    typeof preview.createPreviewRequestHandler,
    "function",
    "preview server must expose an HTTP request handler"
  );

  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-preview-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const diskContent = '{"projects":[{"displayName":"Published"}]}\n';
  await writeFile(join(root, "projects.json"), diskContent, "utf8");
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><html><head></head><body>Preview</body></html>",
    "utf8"
  );

  const store = new preview.DraftContentStore({
    loadSnapshot: async () =>
      new Map([["projects.json", { projects: [{ displayName: "Saved draft" }] }]]),
  });
  const handler = preview.createPreviewRequestHandler({ repoRoot: root, store });
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/projects.json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).projects[0].displayName, "Saved draft");
  assert.equal(await readFile(join(root, "projects.json"), "utf8"), diskContent);
});

test("serves an injected homepage for a Storyblok project route", async (t) => {
  const preview = await import(previewModuleUrl);
  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-route-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, "index.html"),
    "<!doctype html><html><head></head><body>Project preview</body></html>",
    "utf8"
  );
  const store = new preview.DraftContentStore({
    loadSnapshot: async () => new Map([["projects.json", { projects: [] }]]),
  });
  const server = createServer(preview.createPreviewRequestHandler({ repoRoot: root, store }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/projects/the-athenaeum`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Project preview/);
  assert.match(html, /<base href="\/">/);
  assert.match(html, /storyblok-v2-latest\.js/);
});

test("serves a root stylesheet with its browser content type", async (t) => {
  const preview = await import(previewModuleUrl);
  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-assets-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "style.css"), "body { color: black; }\n", "utf8");
  const store = new preview.DraftContentStore({
    loadSnapshot: async () => new Map([["projects.json", { projects: [] }]]),
  });
  const server = createServer(preview.createPreviewRequestHandler({ repoRoot: root, store }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/style.css`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(await response.text(), "body { color: black; }\n");
});

test("serves media byte ranges for browser video playback", async (t) => {
  const preview = await import(previewModuleUrl);
  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-media-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "assets/uploads"), { recursive: true });
  await writeFile(join(root, "assets/uploads/test.mp4"), Buffer.from("0123456789"));
  const store = new preview.DraftContentStore({
    loadSnapshot: async () => new Map([["projects.json", { projects: [] }]]),
  });
  const server = createServer(preview.createPreviewRequestHandler({ repoRoot: root, store }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/assets/uploads/test.mp4`, {
    headers: { Range: "bytes=2-5" },
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
  assert.equal(response.headers.get("accept-ranges"), "bytes");
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), "2345");
});

test("refresh endpoint replaces the cached draft before the page reloads", async (t) => {
  const preview = await import(previewModuleUrl);
  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-refresh-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  let revision = 0;
  const store = new preview.DraftContentStore({
    maxAgeMs: 60_000,
    loadSnapshot: async () => {
      revision += 1;
      return new Map([["content/home.json", { title: `Draft ${revision}` }]]);
    },
  });
  const server = createServer(preview.createPreviewRequestHandler({ repoRoot: root, store }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  const first = await fetch(`http://127.0.0.1:${port}/content/home.json`);
  assert.equal((await first.json()).title, "Draft 1");

  const refresh = await fetch(`http://127.0.0.1:${port}/__storyblok/refresh`, {
    method: "POST",
  });
  assert.equal(refresh.status, 204);

  const second = await fetch(`http://127.0.0.1:${port}/content/home.json`);
  assert.equal((await second.json()).title, "Draft 2");
});
