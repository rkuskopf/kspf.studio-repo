import { typographyTokens } from "../lib/typography/settings";
import { loadHomePage } from "../lib/storyblok/server";
import type { HomePageData, StoryblokSearchParams } from "../lib/storyblok/types";
import HomepageInitialPosition from "./homepage-initial-position";
import HomepageBlocks from "./homepage-blocks";
import StoryblokPreviewBridge from "./storyblok-preview-bridge";

export const dynamic = "force-dynamic";

export function HomeContentView({ data }: { data: HomePageData }) {

  return (
    <main
      className="homepage"
      data-caption-layout={data.content.captions?.layout || "current"}
      data-hide-project-number={data.content.captions?.showNumber === false}
      data-hide-project-title={data.content.captions?.showTitle === false}
      data-hide-project-category={data.content.captions?.showCategory === false}
      data-hide-project-caption={data.content.captions?.showCaption === false}
      style={typographyTokens(data.site.typography)}
      data-storyblok-content={data.isPreview ? "draft" : "published"}
    >
      <HomepageInitialPosition section={data.content.initialSection} />
      <HomepageBlocks data={data} />
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
