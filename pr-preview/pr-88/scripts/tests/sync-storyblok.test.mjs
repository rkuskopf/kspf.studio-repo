import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const syncModuleUrl = new URL("../sync-storyblok.mjs", import.meta.url);

const story = (fullSlug, component, content = {}) => ({
  id: `${fullSlug}-id`,
  name: fullSlug,
  slug: fullSlug.split("/").at(-1),
  full_slug: fullSlug,
  position: 0,
  content: { component, ...content },
});

test("sync command writes mapped draft files through the shared delivery layer", async (t) => {
  const sync = await import(syncModuleUrl).catch(() => ({}));
  assert.equal(
    typeof sync.runStoryblokSync,
    "function",
    "sync module must expose its shared delivery workflow"
  );

  const targetDir = await mkdtemp(join(tmpdir(), "kspf-storyblok-sync-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace("/v2/cdn/", "");
    let body;
    if (pathname === "stories/site") body = { story: story("site", "site_settings") };
    if (pathname === "stories/home") {
      body = { story: story("home", "home_page", { title: "Synced draft" }) };
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

  await sync.runStoryblokSync({
    token: "preview-secret",
    version: "draft",
    region: "eu",
    targetDir,
    fetchImpl,
    logger: { log() {} },
  });

  const home = JSON.parse(await readFile(join(targetDir, "content/home.json"), "utf8"));
  assert.equal(home.title, "Synced draft");
  const projects = JSON.parse(await readFile(join(targetDir, "projects.json"), "utf8"));
  assert.equal(projects.projects[0].displayName, "Example");
});
