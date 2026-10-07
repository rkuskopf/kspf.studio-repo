import {
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("../../../lib/storyblok/project-server", () => ({
  loadProjectPage: vi.fn(),
}));

import { notFound } from "next/navigation";
import { loadProjectPage } from "../../../lib/storyblok/project-server";
import type {
  ProjectPageData,
  StoryblokSearchParams,
} from "../../../lib/storyblok/types";
import StoryblokPreviewBridge from "../../storyblok-preview-bridge";
import ProjectRoute from "./page";

const data: ProjectPageData = {
  content: {
    storyId: 72,
    storyUuid: "project-uuid",
    slug: "product-design-tracer",
    title: "Routed project",
    displayName: "Routed project",
    category: "Product Design",
    description: "A routed tracer.",
    showOnHome: false,
    metadata: { tags: [] },
    body: [{ _uid: "header-1", component: "project_header" }],
  },
  isPreview: false,
};

const routeProps = ({
  slug = "product-design-tracer",
  searchParams = {},
}: {
  slug?: string;
  searchParams?: StoryblokSearchParams;
} = {}) => ({
  params: Promise.resolve({ slug }),
  searchParams: Promise.resolve(searchParams),
});

const bridgeChild = (page: ReactNode) =>
  (page as ReactElement<{ children: [ReactNode, ReactNode] }>).props.children[1];

beforeEach(() => {
  vi.mocked(loadProjectPage).mockReset();
  vi.mocked(notFound).mockClear();
});

describe("the dynamic project route", () => {
  it("awaits route inputs, loads the project, and renders the mapped result", async () => {
    const searchParams = { _storyblok: "72", filter: ["one", "two"] };
    vi.mocked(loadProjectPage).mockResolvedValue(data);

    const page = await ProjectRoute(
      routeProps({ slug: "product-design-tracer", searchParams })
    );
    const markup = renderToStaticMarkup(createElement(() => page));

    expect(loadProjectPage).toHaveBeenCalledWith({
      slug: "product-design-tracer",
      searchParams,
    });
    expect(markup).toContain("<h1>Routed project</h1>");
    expect(bridgeChild(page)).toBeNull();
  });

  it("mounts the existing Bridge only for preview data", async () => {
    vi.mocked(loadProjectPage).mockResolvedValue({ ...data, isPreview: true });

    const page = await ProjectRoute(routeProps());
    const bridge = bridgeChild(page);

    expect(isValidElement(bridge)).toBe(true);
    expect((bridge as ReactElement).type).toBe(StoryblokPreviewBridge);
  });

  it("invokes notFound when the project loader returns null", async () => {
    vi.mocked(loadProjectPage).mockResolvedValue(null);

    await expect(
      ProjectRoute(routeProps({ slug: "missing-project" }))
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});
