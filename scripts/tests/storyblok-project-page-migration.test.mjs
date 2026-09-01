import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  PROJECT_PAGE_COMPONENTS,
  PROJECT_PAGE_FIELDS,
} from "../storyblok-project-page-schema.mjs";
import { STORYBLOK_COMPONENTS } from "../storyblok-schema.mjs";
import {
  TRACER_ASSET_URL,
  TRACER_FULL_SLUG,
  buildProductDesignTracer,
  createStoryblokManagementApi,
  mergeProjectPageFields,
  runProjectPageMigration,
} from "../storyblok-project-page-migration.mjs";

const clone = (value) => structuredClone(value);
const projectTemplate = STORYBLOK_COMPONENTS.find(({ name }) => name === "project");
const legacyProject = () => {
  const component = clone(projectTemplate);
  for (const key of Object.keys(PROJECT_PAGE_FIELDS)) delete component.schema[key];
  component.id = 1;
  component.color = "#234567";
  component.internal_note = "preserve this unknown setting";
  component.schema.legacy_extension = {
    type: "text",
    display_name: "Legacy extension",
    pos: 99,
    custom_editor_key: "keep-me",
  };
  return component;
};

const projectsFolder = { id: 20, name: "Projects", slug: "projects", full_slug: "projects/", is_folder: true };
const completeComponents = () => [legacyProject(), ...clone(PROJECT_PAGE_COMPONENTS)];
const legacyComponents = () => [legacyProject()];

const makeUid = () => {
  let count = 0;
  return () => `tracer-uid-${++count}`;
};

const fakeApi = ({ components, stories }) => {
  const state = {
    components: clone(components),
    stories: clone(stories),
    writes: [],
    storyCreates: [],
    storyUpdates: [],
    publishes: [],
  };
  let nextComponentId = 100;
  let nextStoryId = 200;

  return {
    ...state,
    async listComponents() {
      return clone(state.components);
    },
    async listStories() {
      return clone(state.stories);
    },
    async createComponent(component) {
      const saved = { ...clone(component), id: nextComponentId++ };
      state.components.push(saved);
      state.writes.push({ kind: "create-component", component: saved });
      return clone(saved);
    },
    async updateComponent(id, component) {
      const index = state.components.findIndex((item) => item.id === id);
      state.components[index] = { ...clone(component), id };
      state.writes.push({ kind: "update-component", id, component: clone(component) });
      return clone(state.components[index]);
    },
    async createStory(story) {
      const saved = {
        ...clone(story),
        id: nextStoryId++,
        full_slug: `${projectsFolder.slug}/${story.slug}`,
      };
      state.stories.push(saved);
      state.storyCreates.push({ story: clone(story) });
      state.writes.push({ kind: "create-story", story: clone(story) });
      return clone(saved);
    },
    async updateStory(id, story) {
      state.storyUpdates.push({ id, story: clone(story) });
      state.writes.push({ kind: "update-story", id, story: clone(story) });
    },
    async publishStory(id) {
      state.publishes.push(id);
      state.writes.push({ kind: "publish-story", id });
    },
  };
};

test("builds the exact opted-in tracer without uploading an asset", () => {
  const tracer = buildProductDesignTracer(makeUid());

  assert.equal(TRACER_FULL_SLUG, "projects/product-design-tracer");
  assert.equal(
    TRACER_ASSET_URL,
    "https://raw.githubusercontent.com/rkuskopf/kspf.studio-repo/main/assets/flav/Frame%2019.png"
  );
  assert.deepEqual(
    {
      name: tracer.name,
      slug: tracer.slug,
      is_folder: tracer.is_folder,
      content: {
        component: tracer.content.component,
        title: tracer.content.title,
        display_name: tracer.content.display_name,
        category: tracer.content.category,
        description: tracer.content.description,
        show_on_home: tracer.content.show_on_home,
        client: tracer.content.client,
        year: tracer.content.year,
        discipline: tracer.content.discipline,
        thumbnail: tracer.content.thumbnail,
        page_enabled: tracer.content.page_enabled,
        tags: tracer.content.tags.map(({ component, label }) => ({ component, label })),
        body: tracer.content.body.map(({ component }) => component),
      },
    },
    {
      name: "Product design tracer",
      slug: "product-design-tracer",
      is_folder: false,
      content: {
        component: "project",
        title: "Product design tracer",
        display_name: "Product design tracer",
        category: "Product Design",
        description: "A minimal schema tracer for the project-page model.",
        show_on_home: false,
        client: "KSPF",
        year: "2026",
        discipline: "Product design",
        thumbnail: "",
        page_enabled: true,
        tags: [
          { component: "project_tag", label: "Tracer" },
          { component: "project_tag", label: "Prototype" },
        ],
        body: ["project_header", "text", "media"],
      },
    }
  );
  const text = tracer.content.body[1].content.content[0].content[0].text;
  assert.equal(
    text,
    "This minimal Storyblok project verifies the canonical project record, ordered blocks, and draft preview path."
  );
  assert.deepEqual(tracer.content.body[2].asset, {
    filename: TRACER_ASSET_URL,
    fieldtype: "asset",
  });
  assert.equal(tracer.content.body[2].alt, "KSPF brand mark");
});

test("merges approved fields without changing legacy objects or component settings", () => {
  const existing = legacyProject();
  const original = clone(existing);
  const result = mergeProjectPageFields(existing);

  assert.equal(result.changed, true);
  assert.deepEqual(existing, original);
  assert.equal(result.component.color, "#234567");
  assert.equal(result.component.internal_note, "preserve this unknown setting");
  assert.deepEqual(result.component.schema.legacy_extension, original.schema.legacy_extension);
  assert.deepEqual(result.component.schema.client, PROJECT_PAGE_FIELDS.client);
  assert.deepEqual(Object.keys(result.component.schema).slice(-7), Object.keys(PROJECT_PAGE_FIELDS));
});

test("refuses a conflicting existing approved field", () => {
  const existing = legacyProject();
  existing.schema.client = { type: "textarea", display_name: "Client", pos: 9 };

  assert.throws(() => mergeProjectPageFields(existing), /project field "client" conflicts/i);
});

test("dry run plans changes without writes", async () => {
  const api = fakeApi({ components: legacyComponents(), stories: [projectsFolder] });
  const result = await runProjectPageMigration({ api, mode: "plan", uid: makeUid() });

  assert.equal(api.writes.length, 0);
  assert.deepEqual(result.actions.map(({ kind }) => kind), [
    "create-component", "create-component", "create-component", "create-component",
    "update-project-component", "create-tracer-draft",
  ]);
});

test("apply creates only the tracer story and never updates existing stories", async () => {
  const aesop = {
    id: 21,
    name: "Aesop",
    slug: "aesop",
    full_slug: "projects/aesop",
    content: { component: "project", title: "Aesop" },
  };
  const api = fakeApi({ components: legacyComponents(), stories: [projectsFolder, aesop] });

  await runProjectPageMigration({ api, mode: "apply", uid: makeUid() });

  assert.deepEqual(api.storyCreates.map(({ story }) => story.slug), ["product-design-tracer"]);
  assert.equal(api.storyUpdates.length, 0);
  assert.equal(api.publishes.length, 0);
  assert.equal(api.storyCreates[0].story.parent_id, projectsFolder.id);
});

test("a verified rerun is write-free", async () => {
  const api = fakeApi({ components: legacyComponents(), stories: [projectsFolder] });
  await runProjectPageMigration({ api, mode: "apply", uid: makeUid() });
  api.writes.length = 0;
  api.storyCreates.length = 0;

  const result = await runProjectPageMigration({ api, mode: "apply", uid: makeUid() });

  assert.equal(api.writes.length, 0);
  assert.deepEqual(result.actions, []);
});

test("refuses a same-named component with a conflicting schema", async () => {
  const components = completeComponents();
  components.find(({ name }) => name === "project_tag").schema.label.type = "textarea";
  const api = fakeApi({ components, stories: [projectsFolder] });

  await assert.rejects(
    () => runProjectPageMigration({ api, mode: "apply", uid: makeUid() }),
    /component "project_tag" conflicts/i
  );
  assert.equal(api.writes.length, 0);
});

test("refuses to replace an altered tracer", async () => {
  const tracer = buildProductDesignTracer(makeUid());
  tracer.id = 44;
  tracer.full_slug = TRACER_FULL_SLUG;
  tracer.content.client = "Someone else";
  const api = fakeApi({ components: completeComponents(), stories: [projectsFolder, tracer] });

  await assert.rejects(
    () => runProjectPageMigration({ api, mode: "apply", uid: makeUid() }),
    /existing tracer.*refus/i
  );
  assert.equal(api.writes.length, 0);
});

test("publish refuses an absent or unverified tracer", async () => {
  const absent = fakeApi({ components: completeComponents(), stories: [projectsFolder] });
  await assert.rejects(
    () => runProjectPageMigration({ api: absent, mode: "publish", uid: makeUid() }),
    /tracer.*not found/i
  );
  assert.equal(absent.writes.length, 0);

  const altered = buildProductDesignTracer(makeUid());
  altered.id = 45;
  altered.full_slug = TRACER_FULL_SLUG;
  altered.content.body = [];
  const unverified = fakeApi({ components: completeComponents(), stories: [projectsFolder, altered] });
  await assert.rejects(
    () => runProjectPageMigration({ api: unverified, mode: "publish", uid: makeUid() }),
    /existing tracer.*refus/i
  );
  assert.equal(unverified.writes.length, 0);
});

test("publish calls only the exact verified tracer ID", async () => {
  const tracer = buildProductDesignTracer(makeUid());
  tracer.id = 47;
  tracer.full_slug = TRACER_FULL_SLUG;
  const aesop = { id: 48, full_slug: "projects/aesop", content: { component: "project" } };
  const api = fakeApi({ components: completeComponents(), stories: [projectsFolder, aesop, tracer] });

  const result = await runProjectPageMigration({ api, mode: "publish", uid: makeUid() });

  assert.deepEqual(api.publishes, [47]);
  assert.deepEqual(result.actions, [{ kind: "publish-tracer", id: 47 }]);
  assert.equal(api.storyUpdates.length, 0);
});

test("management API paginates reads and redacts failed requests", async () => {
  const calls = [];
  const api = createStoryblokManagementApi({
    spaceId: "12345",
    token: "secret-token",
    region: "ap",
    fetchImpl: async (url) => {
      calls.push(String(url));
      const page = new URL(url).searchParams.get("page");
      if (page === "1") return new Response(JSON.stringify({ stories: Array.from({ length: 100 }, (_, id) => ({ id })) }));
      return new Response(JSON.stringify({ stories: [{ id: 100 }] }));
    },
  });

  assert.equal((await api.listStories()).length, 101);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url.startsWith("https://api-ap.storyblok.com/v1/spaces/12345/stories")));

  const failingApi = createStoryblokManagementApi({
    spaceId: "12345",
    token: "secret-token",
    fetchImpl: async () => new Response("credential-url?token=secret-token", { status: 403 }),
  });
  await assert.rejects(
    () => failingApi.listComponents(),
    (error) =>
      /Storyblok 403 for GET components\//.test(error.message) &&
      !error.message.includes("secret-token") &&
      !error.message.includes("credential-url")
  );
});

test("CLI rejects combined flags and keeps missing credentials secret", () => {
  const combined = spawnSync(process.execPath, ["scripts/setup-project-page.mjs", "--apply", "--publish"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(combined.status, 1);
  assert.match(combined.stderr, /Use --apply and --publish as separate verified steps\./);

  const missing = spawnSync(process.execPath, ["scripts/setup-project-page.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, STORYBLOK_SPACE_ID: "", STORYBLOK_MANAGEMENT_TOKEN: "sentinel-token" },
    encoding: "utf8",
  });
  const output = `${missing.stdout}${missing.stderr}`;
  assert.equal(missing.status, 1);
  assert.match(output, /STORYBLOK_SPACE_ID/);
  assert.ok(!output.includes("sentinel-token"));
  assert.ok(!output.includes("https://"));
});
