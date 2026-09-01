import { PROJECT_PAGE_COMPONENTS, PROJECT_PAGE_FIELDS } from "./storyblok-project-page-schema.mjs";
import { isDeepStrictEqual } from "node:util";

export const TRACER_FULL_SLUG = "projects/product-design-tracer";
export const TRACER_ASSET_URL =
  "https://raw.githubusercontent.com/rkuskopf/kspf.studio-repo/main/assets/flav/Frame%2019.png";

const MANAGEMENT_HOSTS = {
  eu: "https://mapi.storyblok.com/v1",
  us: "https://api-us.storyblok.com/v1",
  ca: "https://api-ca.storyblok.com/v1",
  ap: "https://api-ap.storyblok.com/v1",
  cn: "https://app.storyblokchina.cn/v1",
};

const clone = (value) => structuredClone(value);
const equal = (left, right) => isDeepStrictEqual(left, right);

const withoutUids = (value) => {
  if (Array.isArray(value)) return value.map(withoutUids);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "_uid")
      .map(([key, child]) => [key, withoutUids(child)])
  );
};

const assertApprovedSubset = (existing, approved, label) => {
  for (const [key, expected] of Object.entries(approved)) {
    if (!(key in existing) || !equal(existing[key], expected)) {
      throw new Error(`${label} conflicts with the approved project-page schema.`);
    }
  }
};

const assertExistingComponent = (component, approved) => {
  assertApprovedSubset(component, approved, `Existing component "${approved.name}"`);
};

const randomUid = () => crypto.randomUUID();

export const buildProductDesignTracer = (uid = randomUid) => ({
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
    tags: [
      { _uid: uid(), component: "project_tag", label: "Tracer" },
      { _uid: uid(), component: "project_tag", label: "Prototype" },
    ],
    page_enabled: true,
    body: [
      { _uid: uid(), component: "project_header" },
      {
        _uid: uid(),
        component: "text",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This minimal Storyblok project verifies the canonical project record, ordered blocks, and draft preview path.",
                },
              ],
            },
          ],
        },
      },
      {
        _uid: uid(),
        component: "media",
        asset: { filename: TRACER_ASSET_URL, fieldtype: "asset" },
        alt: "KSPF brand mark",
      },
    ],
  },
});

export const mergeProjectPageFields = (existingComponent) => {
  if (!existingComponent || existingComponent.name !== "project" || !existingComponent.schema) {
    throw new Error('Expected the existing Storyblok "project" component.');
  }

  const component = clone(existingComponent);
  let changed = false;
  for (const [name, approvedField] of Object.entries(PROJECT_PAGE_FIELDS)) {
    if (name in component.schema) {
      if (!equal(component.schema[name], approvedField)) {
        throw new Error(`Existing project field "${name}" conflicts with the approved project-page schema.`);
      }
    } else {
      component.schema[name] = clone(approvedField);
      changed = true;
    }
  }
  return { component, changed };
};

const verifiedTracer = (story, uid) => {
  const expected = buildProductDesignTracer(uid);
  return (
    story?.full_slug === TRACER_FULL_SLUG &&
    story.name === expected.name &&
    story.slug === expected.slug &&
    equal(withoutUids(story.content), withoutUids(expected.content))
  );
};

export const runProjectPageMigration = async ({ api, mode = "plan", uid = randomUid }) => {
  if (!api || !["plan", "apply", "publish"].includes(mode)) {
    throw new Error('Project-page migration mode must be "plan", "apply", or "publish".');
  }

  const [components, projectFolders, tracerSummaries] = await Promise.all([
    api.listComponents(),
    api.findStoriesByFullSlug("projects"),
    api.findStoriesByFullSlug(TRACER_FULL_SLUG),
  ]);
  const project = components.find(({ name }) => name === "project");
  const projectsFolder = projectFolders.find(
    (story) => story.full_slug === "projects" && story.is_folder === true
  );
  if (!project) throw new Error('Storyblok is missing the existing "project" component.');
  if (!projectsFolder) throw new Error('Storyblok is missing the existing Projects folder.');

  const tracerSummary = tracerSummaries.find(({ full_slug }) => full_slug === TRACER_FULL_SLUG);
  const tracer = tracerSummary ? await api.getStory(tracerSummary.id) : undefined;
  if (tracer && !verifiedTracer(tracer, uid)) {
    throw new Error("Existing tracer differs from the verified draft; refusing replacement.");
  }
  if (mode === "publish") {
    if (!tracer) throw new Error("Verified tracer was not found; apply and review the draft before publishing.");
    const action = { kind: "publish-tracer", id: tracer.id };
    await api.publishStory(tracer.id);
    return { actions: [action] };
  }

  const actions = [];
  const componentByName = new Map(components.map((component) => [component.name, component]));
  for (const approved of PROJECT_PAGE_COMPONENTS) {
    const existing = componentByName.get(approved.name);
    if (existing) {
      assertExistingComponent(existing, approved);
    } else {
      actions.push({ kind: "create-component", name: approved.name });
    }
  }

  const merged = mergeProjectPageFields(project);
  if (merged.changed) actions.push({ kind: "update-project-component", id: project.id });
  if (!tracer) actions.push({ kind: "create-tracer-draft", slug: TRACER_FULL_SLUG });

  if (mode === "apply") {
    for (const approved of PROJECT_PAGE_COMPONENTS) {
      if (!componentByName.has(approved.name)) await api.createComponent(clone(approved));
    }
    if (merged.changed) await api.updateComponent(project.id, merged.component);
    if (!tracer) {
      await api.createStory({ ...buildProductDesignTracer(uid), parent_id: projectsFolder.id });
    }
  }
  return { actions };
};

const validateManagementConfig = ({ spaceId, token, region = "eu" }) => {
  if (!spaceId || !/^\d+$/.test(String(spaceId))) {
    throw new Error("STORYBLOK_SPACE_ID must be the numeric ID of the target Storyblok space.");
  }
  if (!token) throw new Error("STORYBLOK_MANAGEMENT_TOKEN is required.");
  const normalizedRegion = String(region).toLowerCase();
  if (!MANAGEMENT_HOSTS[normalizedRegion]) {
    throw new Error(`Unsupported Storyblok region "${normalizedRegion}". Use eu, us, ca, ap, or cn.`);
  }
  return { spaceId: String(spaceId), token, region: normalizedRegion };
};

export const createStoryblokManagementApi = ({
  spaceId,
  token,
  region = "eu",
  fetchImpl = fetch,
}) => {
  const config = validateManagementConfig({ spaceId, token, region });
  const baseUrl = MANAGEMENT_HOSTS[config.region];

  const request = async (resource, { method = "GET", body, query } = {}) => {
    const url = new URL(`${baseUrl}/spaces/${config.spaceId}/${resource}`);
    for (const [name, value] of Object.entries(query || {})) url.searchParams.set(name, String(value));
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: config.token,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(`Storyblok request failed for ${method} ${resource}.`);
    }
    if (!response.ok) throw new Error(`Storyblok ${response.status} for ${method} ${resource}.`);
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Storyblok returned invalid JSON for ${method} ${resource}.`);
    }
  };

  const listAll = async (resource, key, query = {}) => {
    const values = [];
    for (let page = 1; ; page += 1) {
      const data = await request(resource, { query: { ...query, page, per_page: 100 } });
      const batch = Array.isArray(data[key]) ? data[key] : [];
      values.push(...batch);
      if (batch.length < 100) return values;
    }
  };

  return {
    listComponents: () => listAll("components/", "components"),
    findStoriesByFullSlug: (fullSlug) => listAll("stories", "stories", { by_slugs: fullSlug }),
    async getStory(id) {
      const data = await request(`stories/${id}`);
      return data.story;
    },
    async createComponent(component) {
      const data = await request("components/", { method: "POST", body: { component } });
      return data.component;
    },
    async updateComponent(id, component) {
      const data = await request(`components/${id}`, { method: "PUT", body: { component } });
      return data.component;
    },
    async createStory(story) {
      const data = await request("stories", { method: "POST", body: { publish: false, story } });
      return data.story;
    },
    publishStory: (id) => request(`stories/${id}/publish`),
  };
};
