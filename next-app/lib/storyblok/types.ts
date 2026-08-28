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
