import { StoryblokConfigurationError } from "./preview";
import type {
  HomeContent,
  HomepageProject,
  ProjectMediaType,
  SiteContent,
  StoryblokVersion,
} from "./types";

const DELIVERY_HOSTS = {
  eu: "https://api.storyblok.com/v2/cdn",
  us: "https://api-us.storyblok.com/v2/cdn",
  ca: "https://api-ca.storyblok.com/v2/cdn",
  ap: "https://api-ap.storyblok.com/v2/cdn",
  cn: "https://app.storyblokchina.cn/v2/cdn",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidHomeStory = (detail: string): never => {
  throw new Error(`Storyblok home story ${detail}.`);
};

const invalidSiteStory = (detail: string): never => {
  throw new Error(`Storyblok site story ${detail}.`);
};

const invalidHomepageProjects = (detail: string): never => {
  throw new Error(`Storyblok homepage projects ${detail}.`);
};

export const storyblokDeliveryBaseUrl = (region = "eu") => {
  const normalized = region.toLowerCase() as keyof typeof DELIVERY_HOSTS;
  const baseUrl = DELIVERY_HOSTS[normalized];
  if (!baseUrl) {
    throw new StoryblokConfigurationError(
      `Unsupported Storyblok region "${region.toLowerCase()}". Use eu, us, ca, ap, or cn.`
    );
  }
  return baseUrl;
};

const mapHomeContent = (payload: unknown): HomeContent => {
  if (!isRecord(payload) || !isRecord(payload.story)) {
    return invalidHomeStory("is missing from the delivery response");
  }

  const { story } = payload;
  if (!Number.isSafeInteger(story.id) || Number(story.id) <= 0) {
    return invalidHomeStory("has an invalid numeric ID");
  }
  if (typeof story.uuid !== "string" || !story.uuid) {
    return invalidHomeStory("has an invalid UUID");
  }
  if (!isRecord(story.content)) {
    return invalidHomeStory("has invalid content");
  }

  const content = story.content;
  if (content.component !== "home_page") {
    return invalidHomeStory('must use the "home_page" component');
  }
  if (typeof content.title !== "string") {
    return invalidHomeStory("has an invalid title");
  }
  if (typeof content.intro !== "string") {
    return invalidHomeStory("has an invalid intro");
  }
  if (
    content.meta_description !== undefined &&
    typeof content.meta_description !== "string"
  ) {
    return invalidHomeStory("has an invalid meta description");
  }
  if (
    content.initial_section !== undefined &&
    content.initial_section !== "info" &&
    content.initial_section !== "work"
  ) {
    return invalidHomeStory("has an invalid initial section");
  }
  if (
    content.show_navigation !== undefined &&
    typeof content.show_navigation !== "boolean"
  ) {
    return invalidHomeStory("has an invalid navigation visibility");
  }

  return {
    storyId: story.id as number,
    storyUuid: story.uuid,
    title: content.title,
    metaDescription: content.meta_description ?? "",
    intro: content.intro,
    initialSection: content.initial_section === "info" ? "info" : "work",
    showNavigation: content.show_navigation !== false,
  };
};

const requiredString = (
  value: unknown,
  label: string,
  invalid: (detail: string) => never
) => {
  if (typeof value !== "string") return invalid(`has an invalid ${label}`);
  return value;
};

const firstBlock = (
  value: unknown,
  component: string,
  label: string,
  invalid: (detail: string) => never
) => {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    !isRecord(value[0]) ||
    value[0].component !== component
  ) {
    return invalid(`has an invalid ${label}`);
  }
  return value[0];
};

const mapLink = (value: unknown, label: string) => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return invalidSiteStory(`has an invalid ${label}`);
  const candidate = value.url || value.cached_url || value.filename;
  if (typeof candidate !== "string") {
    return invalidSiteStory(`has an invalid ${label}`);
  }
  return candidate;
};

const mapTextItems = (value: unknown) => {
  if (!Array.isArray(value)) return invalidSiteStory("has invalid services");
  return value.map((item) => {
    if (
      !isRecord(item) ||
      item.component !== "text_item" ||
      typeof item.text !== "string" ||
      !item.text.trim()
    ) {
      return invalidSiteStory("has an invalid service item");
    }
    return item.text;
  });
};

const mapSiteContent = (payload: unknown): SiteContent => {
  if (!isRecord(payload) || !isRecord(payload.story)) {
    return invalidSiteStory("is missing from the delivery response");
  }
  const { story } = payload;
  if (!Number.isSafeInteger(story.id) || Number(story.id) <= 0) {
    return invalidSiteStory("has an invalid numeric ID");
  }
  if (typeof story.uuid !== "string" || !story.uuid) {
    return invalidSiteStory("has an invalid UUID");
  }
  if (!isRecord(story.content) || story.content.component !== "site_settings") {
    return invalidSiteStory('must use the "site_settings" component');
  }

  const nav = firstBlock(
    story.content.nav,
    "nav_settings",
    "navigation block",
    invalidSiteStory
  );
  const information = firstBlock(
    story.content.information_overlay,
    "information_overlay",
    "information block",
    invalidSiteStory
  );
  const homeLabel = requiredString(nav.home_label, "home label", invalidSiteStory);

  return {
    storyId: story.id as number,
    storyUuid: story.uuid,
    nav: {
      homeLabel,
      homeHref: mapLink(nav.home_href, "home link"),
      informationLabel: requiredString(
        nav.information_label,
        "information label",
        invalidSiteStory
      ),
      informationHref: mapLink(nav.information_href, "information link"),
      showInformation: nav.show_about === true,
    },
    information: {
      title: homeLabel,
      profile: requiredString(story.content.profile, "profile", invalidSiteStory),
      contactTitle: requiredString(
        information.contact_title,
        "contact title",
        invalidSiteStory
      ),
      contactBody: requiredString(
        information.contact_body,
        "contact body",
        invalidSiteStory
      ),
      contactEmail: requiredString(
        information.contact_email,
        "contact email",
        invalidSiteStory
      ),
      servicesTitle: requiredString(
        information.services_title,
        "services title",
        invalidSiteStory
      ),
      services: mapTextItems(information.services),
    },
  };
};

const videoExtensions = new Set([".m4v", ".mov", ".mp4", ".webm"]);
const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);

const mediaType = (url: string, contentType?: unknown): ProjectMediaType => {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://local.kspf.invalid/");
  } catch {
    return invalidHomepageProjects("has an invalid slide URL");
  }
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  if ((hasScheme && parsed.protocol !== "https:") || url.startsWith("//")) {
    return invalidHomepageProjects("has a non-HTTPS slide URL");
  }
  if (typeof contentType === "string") {
    if (contentType.toLowerCase().startsWith("image/")) return "image";
    if (contentType.toLowerCase().startsWith("video/")) return "video";
  }
  const pathname = parsed.pathname.toLowerCase();
  const dot = pathname.lastIndexOf(".");
  const extension = dot === -1 ? "" : pathname.slice(dot);
  if (videoExtensions.has(extension)) return "video";
  if (imageExtensions.has(extension)) return "image";
  return invalidHomepageProjects("has a slide with an unsupported media type");
};

const mapHomepageSlide = (value: unknown) => {
  if (!isRecord(value) || value.component !== "media_slide") {
    return invalidHomepageProjects("has an invalid slide block");
  }
  const asset = isRecord(value.asset) ? value.asset : undefined;
  const assetUrl = asset && typeof asset.filename === "string" && asset.filename;
  const legacyUrl = typeof value.legacy_url === "string" && value.legacy_url;
  const sourceUrl =
    assetUrl ||
    legacyUrl ||
    "";
  if (!sourceUrl) return invalidHomepageProjects("has a slide without media");
  const url =
    legacyUrl && !/^[a-z][a-z0-9+.-]*:/i.test(legacyUrl) && !legacyUrl.startsWith("//")
      ? new URL(legacyUrl.replace(/^\/+/, ""), "https://kspf.au/").href
      : sourceUrl;
  return { url, type: mediaType(url, asset?.content_type) };
};

const mapHomepageProjectStory = (value: unknown) => {
  if (!isRecord(value) || !isRecord(value.content)) {
    return invalidHomepageProjects("contains an invalid project story");
  }
  const content = value.content;
  if (content.component !== "project") {
    return invalidHomepageProjects('contains a story that is not a "project"');
  }
  if (!Number.isSafeInteger(value.id) || Number(value.id) <= 0) {
    return invalidHomepageProjects("contains a project with an invalid numeric ID");
  }
  if (typeof value.uuid !== "string" || !value.uuid) {
    return invalidHomepageProjects("contains a project with an invalid UUID");
  }
  if (
    typeof value.slug !== "string" ||
    !value.slug ||
    value.full_slug !== `projects/${value.slug}`
  ) {
    return invalidHomepageProjects("contains a project outside the projects folder");
  }
  const visible = content.show_on_home !== false;
  if (visible && (!Array.isArray(content.slides) || content.slides.length === 0)) {
    return invalidHomepageProjects("contains a project without slides");
  }
  const configuredOrder = Number(content.order);
  const position = Number(value.position);
  const order = Number.isFinite(configuredOrder)
    ? configuredOrder
    : Number.isFinite(position)
      ? position
      : 0;
  const title = requiredString(content.title, "project title", invalidHomepageProjects);
  const displayName = requiredString(
    content.display_name,
    "project display name",
    invalidHomepageProjects
  );

  return {
    visible,
    project: {
      storyId: value.id as number,
      storyUuid: value.uuid,
      slug: value.slug,
      title,
      displayName,
      category: requiredString(
        content.category,
        "project category",
        invalidHomepageProjects
      ),
      alt: requiredString(content.alt, "project alt text", invalidHomepageProjects),
      order,
      slides: Array.isArray(content.slides) ? content.slides.map(mapHomepageSlide) : [],
    } satisfies HomepageProject,
  };
};

const deliveryToken = (version: StoryblokVersion, token?: string) => {
  const tokenVariable =
    version === "draft" ? "STORYBLOK_PREVIEW_TOKEN" : "STORYBLOK_PUBLIC_TOKEN";
  if (!token?.trim()) {
    throw new StoryblokConfigurationError(
      `${tokenVariable} is required for Storyblok ${version} delivery.`
    );
  }
  return token;
};

const fetchDeliveryJson = async ({
  path,
  label,
  version,
  token,
  region,
  fetchImpl,
  cacheVersion,
  configureUrl,
}: {
  path: string;
  label: string;
  version: StoryblokVersion;
  token?: string;
  region: string;
  fetchImpl: typeof fetch;
  cacheVersion: number;
  configureUrl?: (url: URL) => void;
}) => {
  const url = new URL(`${storyblokDeliveryBaseUrl(region)}/${path}`);
  url.searchParams.set("token", deliveryToken(version, token));
  url.searchParams.set("version", version);
  if (version === "draft") url.searchParams.set("cv", String(cacheVersion));
  configureUrl?.(url);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(`Storyblok request failed while fetching ${label}.`);
  }
  if (!response.ok) {
    throw new Error(`Storyblok ${response.status} while fetching ${label}.`);
  }
  return response.json() as Promise<unknown>;
};

export async function fetchHomeContent({
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<HomeContent> {
  const tokenVariable =
    version === "draft" ? "STORYBLOK_PREVIEW_TOKEN" : "STORYBLOK_PUBLIC_TOKEN";
  if (!token?.trim()) {
    throw new StoryblokConfigurationError(
      `${tokenVariable} is required for Storyblok ${version} delivery.`
    );
  }

  const url = new URL(`${storyblokDeliveryBaseUrl(region)}/stories/home`);
  url.searchParams.set("token", token);
  url.searchParams.set("version", version);
  if (version === "draft") url.searchParams.set("cv", String(cacheVersion));

  let response: Response;
  try {
    response = await fetchImpl(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error('Storyblok request failed while fetching "home".');
  }

  if (!response.ok) {
    throw new Error(`Storyblok ${response.status} while fetching "home".`);
  }

  return mapHomeContent(await response.json());
}

export async function fetchSiteContent({
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<SiteContent> {
  return mapSiteContent(
    await fetchDeliveryJson({
      path: "stories/site",
      label: '"site"',
      version,
      token,
      region,
      fetchImpl,
      cacheVersion,
    })
  );
}

export async function fetchHomepageProjects({
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<HomepageProject[]> {
  const payload = await fetchDeliveryJson({
    path: "stories",
    label: 'homepage "projects"',
    version,
    token,
    region,
    fetchImpl,
    cacheVersion,
    configureUrl: (url) => {
      url.searchParams.set("starts_with", "projects/");
      url.searchParams.set("per_page", "100");
    },
  });
  if (!isRecord(payload) || !Array.isArray(payload.stories)) {
    return invalidHomepageProjects("are missing from the delivery response");
  }
  return payload.stories
    .filter(
      (story) =>
        !(
          isRecord(story) &&
          isRecord(story.content) &&
          story.content.show_on_home === false
        )
    )
    .map(mapHomepageProjectStory)
    .filter(({ visible }) => visible)
    .map(({ project }) => project)
    .sort((a, b) => a.order - b.order);
}
