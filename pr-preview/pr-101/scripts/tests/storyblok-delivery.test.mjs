import assert from "node:assert/strict";
import test from "node:test";

const deliveryModuleUrl = new URL("../storyblok-delivery.mjs", import.meta.url);

const story = (fullSlug, component, content = {}) => ({
  id: `${fullSlug}-id`,
  name: fullSlug,
  slug: fullSlug.split("/").at(-1),
  full_slug: fullSlug,
  position: 0,
  content: { component, ...content },
});

test("fetches EU draft stories and returns mapped files in memory", async () => {
  const delivery = await import(deliveryModuleUrl).catch(() => ({}));
  assert.equal(
    typeof delivery.fetchStoryblokContent,
    "function",
    "storyblok delivery must expose an in-memory fetch function"
  );

  const requests = [];
  const responses = new Map([
    ["stories/site", { story: story("site", "site_settings") }],
    ["stories/home", { story: story("home", "home_page", { title: "Draft home" }) }],
    ["stories/experience", { story: story("experience", "experience_page") }],
    [
      "stories?projects",
      {
        stories: [
          story("projects/the-athenaeum", "project", {
            display_name: "The Athenaeum",
            slides: [],
          }),
        ],
      },
    ],
    [
      "stories?case-studies",
      {
        stories: [story("case-studies/case-study-aesop", "case_study")],
      },
    ],
  ]);

  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    requests.push(parsed);
    let key = parsed.pathname.replace("/v2/cdn/", "");
    if (key === "stories") {
      key += parsed.searchParams.get("starts_with") === "projects/"
        ? "?projects"
        : "?case-studies";
    }
    const body = responses.get(key);
    return {
      ok: Boolean(body),
      status: body ? 200 : 404,
      json: async () => body,
      text: async () => (body ? "" : "not found"),
    };
  };

  const result = await delivery.fetchStoryblokContent({
    token: "preview-secret",
    version: "draft",
    region: "eu",
    fetchImpl,
    cacheVersion: 123,
  });

  assert.equal(result.files.get("content/home.json").title, "Draft home");
  assert.equal(result.files.get("projects.json").projects[0].displayName, "The Athenaeum");
  assert.equal(requests.length, 5);
  requests.forEach((request) => {
    assert.equal(request.origin, "https://api.storyblok.com");
    assert.equal(request.searchParams.get("token"), "preview-secret");
    assert.equal(request.searchParams.get("version"), "draft");
    assert.equal(request.searchParams.get("cv"), "123");
  });
});
