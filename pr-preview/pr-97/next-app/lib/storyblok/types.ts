export type StoryblokVersion = "published" | "draft";

export type StoryblokSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type StoryblokEnvironment = {
  NODE_ENV?: string;
  STORYBLOK_PUBLIC_TOKEN?: string;
  STORYBLOK_PREVIEW_TOKEN?: string;
  STORYBLOK_REGION?: string;
};

export type HomeContent = {
  storyId: number;
  storyUuid: string;
  title: string;
  metaDescription: string;
  intro: string;
};

export type HomePageData = {
  content: HomeContent;
  isPreview: boolean;
};

export type ProjectMediaType = "image" | "video";

export type ProjectAsset = {
  url: string;
  type: ProjectMediaType;
};

export type ProjectMetadata = {
  client?: string;
  year?: string;
  discipline?: string;
  thumbnail?: ProjectAsset;
  tags: string[];
};

export type ProjectHeaderBlock = {
  _uid: string;
  component: "project_header";
};

export type ProjectTextBlock = {
  _uid: string;
  component: "text";
  content: { type: "doc"; content: unknown[] };
};

export type ProjectMediaBlock = {
  _uid: string;
  component: "media";
  asset: { url: string; type: "image" | "video" };
  alt?: string;
  caption?: string;
};

export type ProjectBlock =
  | ProjectHeaderBlock
  | ProjectTextBlock
  | ProjectMediaBlock;

export type ProjectContent = {
  storyId: number;
  storyUuid: string;
  slug: string;
  title: string;
  displayName: string;
  category: string;
  description: string;
  showOnHome: boolean;
  metadata: ProjectMetadata;
  body: ProjectBlock[];
};

export type ProjectPageData = {
  content: ProjectContent;
  isPreview: boolean;
};
