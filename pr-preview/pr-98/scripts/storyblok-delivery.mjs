import { buildContentFiles } from "./storyblok-content.mjs";

const DELIVERY_HOSTS = {
  eu: "https://api.storyblok.com/v2/cdn",
  us: "https://api-us.storyblok.com/v2/cdn",
  ca: "https://api-ca.storyblok.com/v2/cdn",
  ap: "https://api-ap.storyblok.com/v2/cdn",
  cn: "https://app.storyblokchina.cn/v2/cdn",
};

export const storyblokDeliveryBaseUrl = (region) => {
  const normalized = String(region || "eu").toLowerCase();
  const baseUrl = DELIVERY_HOSTS[normalized];
  if (!baseUrl) {
    throw new Error(`Unsupported Storyblok region "${normalized}". Use eu, us, ca, ap, or cn.`);
  }
  return baseUrl;
};

export const fetchStoryblokContent = async ({
  token,
  version = "published",
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}) => {
  if (!token) throw new Error("A Storyblok delivery token is required.");
  if (!new Set(["published", "draft"]).has(version)) {
    throw new Error('Storyblok version must be either "published" or "draft".');
  }

  const baseUrl = storyblokDeliveryBaseUrl(region);
  const request = async (path, params = {}) => {
    const url = new URL(`${baseUrl}/${path}`);
    url.searchParams.set("token", token);
    url.searchParams.set("version", version);
    url.searchParams.set("cv", String(cacheVersion));
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

    const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`Storyblok ${response.status} for ${path}: ${detail}`);
    }
    return response.json();
  };

  const getStory = async (slug) => {
    const data = await request(`stories/${slug}`);
    if (!data.story) throw new Error(`Storyblok did not return the required "${slug}" story.`);
    return data.story;
  };

  const getStories = async (startsWith, contentType) => {
    const data = await request("stories", {
      starts_with: startsWith,
      content_type: contentType,
      per_page: 100,
    });
    return Array.isArray(data.stories) ? data.stories : [];
  };

  const [site, home, experience, projects, caseStudies] = await Promise.all([
    getStory("site"),
    getStory("home"),
    getStory("experience"),
    getStories("projects/", "project"),
    getStories("case-studies/", "case_study"),
  ]);

  return {
    site,
    home,
    experience,
    projects,
    caseStudies,
    files: buildContentFiles({ site, home, experience, projects, caseStudies }),
  };
};
