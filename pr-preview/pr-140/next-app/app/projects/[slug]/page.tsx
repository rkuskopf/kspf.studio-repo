import { notFound } from "next/navigation";

import { loadProjectPage } from "../../../lib/storyblok/project-server";
import type { StoryblokSearchParams } from "../../../lib/storyblok/types";
import StoryblokPreviewBridge from "../../storyblok-preview-bridge";
import { ProjectPageView } from "./project-page";

export const dynamic = "force-dynamic";

export default async function ProjectRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StoryblokSearchParams>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const data = await loadProjectPage({
    slug,
    searchParams: resolvedSearchParams,
  });

  if (!data) notFound();

  return (
    <>
      <ProjectPageView data={data} />
      {data.isPreview ? <StoryblokPreviewBridge /> : null}
    </>
  );
}
