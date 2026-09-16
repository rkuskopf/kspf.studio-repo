import { storyblokDeliveryBaseUrl } from "./delivery";
import { StoryblokConfigurationError } from "./preview";
import type {
  ProjectAsset,
  ProjectBlock,
  ProjectContent,
  ProjectMediaType,
  ProjectMetadata,
  StoryblokVersion,
} from "./types";

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([".m4v", ".mov", ".mp4", ".webm"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalidProjectStory = (detail: string): never => {
  throw new Error(`Storyblok project story ${detail}.`);
};

const requiredUid = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    return invalidProjectStory(`has an invalid ${label} UID`);
  }
  return value;
};

const optionalString = (
  value: unknown,
  label: string
): string | undefined => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    return invalidProjectStory(`has an invalid ${label}`);
  }
  return value;
};

const extensionType = (pathname: string): ProjectMediaType | null => {
  const filename = pathname.slice(pathname.lastIndexOf("/") + 1).toLowerCase();
  const dot = filename.lastIndexOf(".");
  const extension = dot === -1 ? "" : filename.slice(dot);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
};

const mimeType = (value: unknown): ProjectMediaType | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().split(";", 1)[0];
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  return null;
};

export function isProjectSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function detectProjectMediaType(asset: unknown): ProjectMediaType | null {
  if (!isRecord(asset) || typeof asset.filename !== "string") return null;

  let url: URL;
  try {
    url = new URL(asset.filename);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const fromExtension = extensionType(url.pathname);
  const fromMime = mimeType(asset.content_type);
  if (fromExtension && fromMime && fromExtension !== fromMime) return null;
  return fromExtension ?? fromMime;
}

const mapAsset = (value: unknown, label: string): ProjectAsset => {
  const type = detectProjectMediaType(value);
  if (!type || !isRecord(value) || typeof value.filename !== "string") {
    return invalidProjectStory(`has an invalid ${label}`);
  }
  return { url: value.filename, type };
};

const mapMetadata = (content: Record<string, unknown>): ProjectMetadata => {
  const metadata: ProjectMetadata = {
    tags: [],
  };
  const client = optionalString(content.client, "client");
  const year = optionalString(content.year, "year");
  const discipline = optionalString(content.discipline, "discipline");
  if (client !== undefined) metadata.client = client;
  if (year !== undefined) metadata.year = year;
  if (discipline !== undefined) metadata.discipline = discipline;

  const hasThumbnail =
    content.thumbnail !== undefined &&
    content.thumbnail !== "" &&
    !(isRecord(content.thumbnail) && content.thumbnail.filename === "");
  if (hasThumbnail) {
    const thumbnail = mapAsset(content.thumbnail, "thumbnail");
    if (thumbnail.type !== "image") {
      return invalidProjectStory("has a non-image thumbnail");
    }
    metadata.thumbnail = thumbnail;
  }

  if (content.tags !== undefined) {
    if (!Array.isArray(content.tags)) {
      return invalidProjectStory("has invalid tags");
    }
    metadata.tags = content.tags.map((tag) => {
      if (
        !isRecord(tag) ||
        tag.component !== "project_tag" ||
        typeof tag.label !== "string" ||
        !tag.label.trim()
      ) {
        return invalidProjectStory("has an invalid project tag");
      }
      requiredUid(tag._uid, "project tag");
      return tag.label;
    });
  }

  return metadata;
};

const mapBlock = (value: unknown): ProjectBlock => {
  if (!isRecord(value) || typeof value.component !== "string") {
    return invalidProjectStory("has an invalid body block");
  }
  const _uid = requiredUid(value._uid, "body block");

  if (value.component === "project_header") {
    return { _uid, component: "project_header" };
  }

  if (value.component === "text") {
    if (
      !isRecord(value.content) ||
      value.content.type !== "doc" ||
      !Array.isArray(value.content.content)
    ) {
      return invalidProjectStory("has invalid rich text");
    }
    return {
      _uid,
      component: "text",
      content: { type: "doc", content: value.content.content },
    };
  }

  if (value.component === "media") {
    const asset = mapAsset(value.asset, "media asset");
    const alt = optionalString(value.alt, "media alt text");
    const caption = optionalString(value.caption, "media caption");
    if (asset.type === "image" && !alt?.trim()) {
      return invalidProjectStory("has an image without alt text");
    }
    return {
      _uid,
      component: "media",
      asset,
      ...(alt === undefined ? {} : { alt }),
      ...(caption === undefined ? {} : { caption }),
    };
  }

  return invalidProjectStory(`has an unknown body block component`);
};

const previewString = (value: unknown, label: string) =>
  optionalString(value, label) ?? "";

export function mapProjectStory(story: unknown): ProjectContent | null {
  if (!isRecord(story) || !isRecord(story.content)) return null;
  const content = story.content;
  if (content.component !== "project" || content.page_enabled !== true) return null;

  if (!Number.isSafeInteger(story.id) || Number(story.id) <= 0) {
    return invalidProjectStory("has an invalid numeric ID");
  }
  if (typeof story.uuid !== "string" || !story.uuid) {
    return invalidProjectStory("has an invalid UUID");
  }
  requiredUid(content._uid, "content");
  if (typeof story.slug !== "string" || !isProjectSlug(story.slug)) {
    return invalidProjectStory("has an invalid slug");
  }
  if (story.full_slug !== `projects/${story.slug}`) {
    return invalidProjectStory("is outside the canonical projects folder");
  }
  if (typeof content.title !== "string" || !content.title.trim()) {
    return invalidProjectStory("has an invalid title");
  }
  if (content.show_on_home !== undefined && typeof content.show_on_home !== "boolean") {
    return invalidProjectStory("has an invalid show-on-home value");
  }
  if (!Array.isArray(content.body)) {
    return invalidProjectStory("has an invalid body");
  }

  const body = content.body.map(mapBlock);
  if (body.filter((block) => block.component === "project_header").length !== 1) {
    return invalidProjectStory("must contain exactly one project header");
  }

  return {
    storyId: story.id as number,
    storyUuid: story.uuid,
    slug: story.slug,
    title: content.title,
    displayName: previewString(content.display_name, "display name"),
    category: previewString(content.category, "category"),
    description: previewString(content.description, "description"),
    showOnHome: content.show_on_home !== false,
    metadata: mapMetadata(content),
    body,
  };
}

export async function fetchProjectContent({
  slug,
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  slug: string;
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<ProjectContent | null> {
  if (!isProjectSlug(slug)) return null;

  const tokenVariable =
    version === "draft" ? "STORYBLOK_PREVIEW_TOKEN" : "STORYBLOK_PUBLIC_TOKEN";
  if (!token?.trim()) {
    throw new StoryblokConfigurationError(
      `${tokenVariable} is required for Storyblok ${version} delivery.`
    );
  }

  const url = new URL(
    `${storyblokDeliveryBaseUrl(region)}/stories/projects/${slug}`
  );
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
    throw new Error("Storyblok request failed while fetching project content.");
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Storyblok ${response.status} while fetching project content.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Storyblok project response is not valid JSON.");
  }
  const content = isRecord(payload) ? mapProjectStory(payload.story) : null;
  if (content && content.slug !== slug) {
    return invalidProjectStory("does not match the requested slug");
  }
  return content;
}
