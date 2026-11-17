import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const runtimeModuleUrl = new URL("../preview-storyblok.mjs", import.meta.url);

test("normalizes local preview configuration and rejects a missing token", async () => {
  const runtime = await import(runtimeModuleUrl).catch(() => ({}));
  assert.equal(
    typeof runtime.getPreviewConfig,
    "function",
    "preview launcher must expose configuration validation"
  );

  const config = runtime.getPreviewConfig({
    STORYBLOK_PREVIEW_TOKEN: "preview-secret",
    STORYBLOK_REGION: "EU",
    STORYBLOK_PREVIEW_PORT: "9001",
  });
  assert.equal(config.token, "preview-secret");
  assert.equal(config.region, "eu");
  assert.equal(config.port, 9001);
  assert.throws(
    () => runtime.getPreviewConfig({ STORYBLOK_REGION: "eu" }),
    /Missing STORYBLOK_PREVIEW_TOKEN/
  );
});

test("creates reusable localhost certificate files outside tracked content", async (t) => {
  const runtime = await import(runtimeModuleUrl);
  assert.equal(
    typeof runtime.ensureLocalCertificate,
    "function",
    "preview launcher must expose local certificate setup"
  );

  const directory = await mkdtemp(join(tmpdir(), "kspf-storyblok-cert-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const paths = await runtime.ensureLocalCertificate(directory);

  assert.equal(paths.keyPath, join(directory, "localhost-key.pem"));
  assert.equal(paths.certPath, join(directory, "localhost-cert.pem"));
  assert.match(await readFile(paths.certPath, "utf8"), /BEGIN CERTIFICATE/);
  assert.equal((await stat(paths.keyPath)).mode & 0o077, 0);
});

test("starts an HTTPS preview backed by draft Storyblok content", async (t) => {
  const runtime = await import(runtimeModuleUrl);
  assert.equal(
    typeof runtime.startStoryblokPreview,
    "function",
    "preview launcher must expose HTTPS startup"
  );

  const root = await mkdtemp(join(tmpdir(), "kspf-storyblok-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const story = (fullSlug, component, content = {}) => ({
    id: `${fullSlug}-id`,
    name: fullSlug,
    slug: fullSlug.split("/").at(-1),
    full_slug: fullSlug,
    position: 0,
    content: { component, ...content },
  });
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace("/v2/cdn/", "");
    let body;
    if (pathname === "stories/site") body = { story: story("site", "site_settings") };
    if (pathname === "stories/home") {
      body = { story: story("home", "home_page", { title: "HTTPS draft" }) };
    }
    if (pathname === "stories/experience") {
      body = { story: story("experience", "experience_page") };
    }
    if (pathname === "stories") {
      body = parsed.searchParams.get("starts_with") === "projects/"
        ? { stories: [story("projects/example", "project", { display_name: "Example" })] }
        : { stories: [] };
    }
    return {
      ok: Boolean(body),
      status: body ? 200 : 404,
      json: async () => body,
      text: async () => "not found",
    };
  };

  const preview = await runtime.startStoryblokPreview({
    repoRoot: root,
    certificateDirectory: join(root, ".certs"),
    config: { token: "secret", region: "eu", port: 0, host: "127.0.0.1" },
    fetchImpl,
    logger: { log() {}, error() {} },
  });
  t.after(() => new Promise((resolve) => preview.server.close(resolve)));

  const response = await new Promise((resolve, reject) => {
    const request = httpsRequest(
      `${preview.url}content/home.json`,
      { rejectUnauthorized: false },
      (incoming) => {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("end", () => resolve({
          status: incoming.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
        }));
      }
    );
    request.on("error", reject);
    request.end();
  });

  assert.equal(response.status, 200);
  assert.equal(JSON.parse(response.body).title, "HTTPS draft");
});
