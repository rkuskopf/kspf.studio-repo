import { loadHomePage } from "../lib/storyblok/server";
import type { HomePageData, StoryblokSearchParams } from "../lib/storyblok/types";
import StoryblokPreviewBridge from "./storyblok-preview-bridge";

export const dynamic = "force-dynamic";

export function HomeContentView({ data }: { data: HomePageData }) {
  return (
    <main
      className="foundation"
      data-storyblok-content={data.isPreview ? "draft" : "published"}
    >
      <p className="foundation__eyebrow">Storyblok homepage tracer</p>
      <h1>{data.content.title}</h1>
      <p className="foundation__summary">{data.content.intro}</p>
      {data.isPreview ? <StoryblokPreviewBridge /> : null}
    </main>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<StoryblokSearchParams>;
}) {
  const data = await loadHomePage({ searchParams: await searchParams });
  return <HomeContentView data={data} />;
}
