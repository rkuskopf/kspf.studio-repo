# Next.js Homepage Feed and Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete issue #69 by rendering every visible Storyblok project in the current one-column homepage, preserving Information above the feed, and verifying responsive, accessible slideshow parity without adding a separate footer.

**Architecture:** Keep the homepage route server-rendered and change its aggregate contract from one project to an ordered project array. Render one independent client slideshow island per project, with viewport-aware loading and playback, while CSS grid prevents metadata/media collisions. Preserve the existing fixed Storyblok homepage model; composable sections and selectable feed layouts remain #59 and #61.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, Storyblok Delivery API, Vitest 4, CSS, browser screenshot verification.

## Global Constraints

- Do not render the separate Storyblok `footer_settings` block; Information is the homepage's footer-equivalent content above Work.
- Do not change Storyblok schemas or add composable homepage blocks in #69.
- Keep the root static production site and deployment files unchanged.
- Preserve published/draft delivery, credential redaction, project filtering, and configured project order.
- Preserve pointer, keyboard, touch, single-slide, reduced-motion, and portrait-media behaviour.
- Avoid arbitrary tablet breakpoint jumps; shrink the media column before metadata can collide.

---

### Task 1: Return the complete ordered project feed

**Files:**
- Modify: `next-app/lib/storyblok/types.ts`
- Modify: `next-app/lib/storyblok/server.ts`
- Test: `next-app/lib/storyblok/server.test.ts`

**Interfaces:**
- Consumes: `fetchHomepageProjects(options): Promise<HomepageProject[]>` from `next-app/lib/storyblok/delivery.ts`.
- Produces: `HomePageData.projects: HomepageProject[]` for the homepage server component.

- [ ] **Step 1: Update the aggregate tests to require every ordered project**

Replace the first-project assertion and add an empty-feed case:

```ts
expect(data.projects.map((project) => project.displayName)).toEqual([
  "ARCTERYX",
  "Second",
]);

it("fails clearly when Storyblok has no visible homepage projects", async () => {
  const { fetchImpl } = requestRecorder({ stories: [] });
  await expect(loadHomePage({
    searchParams: {},
    environment: {
      NODE_ENV: "development",
      STORYBLOK_PUBLIC_TOKEN: "public-sentinel",
    },
    fetchImpl,
    now: NOW,
  })).rejects.toThrow("Storyblok homepage has no visible projects.");
});
```

Change the recorder signature and collection branch to:

```ts
const requestRecorder = (projectPayload: unknown = projectsResponse) => {
  const requests: URL[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    const payload = url.pathname.endsWith("/stories/home")
      ? homeResponse
      : url.pathname.endsWith("/stories/site")
        ? siteResponse
        : projectPayload;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { requests, fetchImpl };
};
```

- [ ] **Step 2: Run the server boundary test and confirm the contract fails**

Run: `npm test -- next-app/lib/storyblok/server.test.ts`

Expected: FAIL because `HomePageData` and `loadHomePage` still expose `project`.

- [ ] **Step 3: Change the typed aggregate to expose the array**

In `types.ts`:

```ts
export type HomePageData = {
  content: HomeContent;
  site: SiteContent;
  projects: HomepageProject[];
  isPreview: boolean;
};
```

In `server.ts`, retain the empty-feed guard and return the full collection:

```ts
if (projects.length === 0) {
  throw new Error("Storyblok homepage has no visible projects.");
}

return { content, site, projects, isPreview: version === "draft" };
```

- [ ] **Step 4: Run the focused delivery and server tests**

Run: `npm test -- next-app/lib/storyblok/delivery.test.ts next-app/lib/storyblok/server.test.ts`

Expected: PASS, including existing visible filtering and configured ordering coverage.

- [ ] **Step 5: Commit the aggregate contract**

```bash
git add next-app/lib/storyblok/types.ts next-app/lib/storyblok/server.ts next-app/lib/storyblok/server.test.ts
git commit -m "feat: deliver complete homepage project feed"
```

---

### Task 2: Render every project as accessible server content

**Files:**
- Modify: `next-app/app/page.tsx`
- Test: `next-app/app/page.test.tsx`

**Interfaces:**
- Consumes: `HomePageData.projects: HomepageProject[]` from Task 1.
- Produces: ordered `.homepage-project` sections and `HomepageSlideshow({ project, priority })` calls.

- [ ] **Step 1: Make the page fixture contain two projects and assert document order**

Change `publishedData.project` to `publishedData.projects` and add a second record. Add these assertions:

```ts
expect(markup.indexOf("ARCTERYX")).toBeLessThan(markup.indexOf("Second project"));
expect(markup.match(/class="homepage-project"/g)).toHaveLength(2);
expect(markup).toContain('aria-labelledby="homepage-project-arcteryx-title"');
expect(markup).toContain('aria-labelledby="homepage-project-second-title"');
expect(markup).not.toContain('aria-live="polite"');
expect(markup.indexOf('id="information"')).toBeLessThan(
  markup.indexOf('id="homepage-project-arcteryx-title"')
);
expect(markup).not.toContain("<footer");
```

- [ ] **Step 2: Run the page test and confirm it fails**

Run: `npm test -- next-app/app/page.test.tsx`

Expected: FAIL because the page still reads `data.project` and renders one section with a live region.

- [ ] **Step 3: Map the complete feed and label each section**

Replace the single project section with:

```tsx
<div className="homepage-projects">
  {data.projects.map((project, index) => {
    const titleId = `homepage-project-${project.slug}-title`;
    return (
      <section
        className="homepage-project"
        aria-labelledby={titleId}
        key={project.storyId}
      >
        <p className="homepage-project__name" id={titleId}>
          {project.displayName}
        </p>
        <HomepageSlideshow project={project} priority={index === 0} />
        <p className="homepage-project__category">{project.category}</p>
      </section>
    );
  })}
</div>
```

Update the draft fixture to pass `projects: publishedData.projects`.

- [ ] **Step 4: Temporarily accept the new slideshow prop and run the page test**

Add `priority = false` to the slideshow prop signature without changing loading yet:

```ts
export default function HomepageSlideshow({
  project,
  priority = false,
}: {
  project: HomepageProject;
  priority?: boolean;
}) {
  void priority;
```

Run: `npm test -- next-app/app/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the complete semantic feed**

```bash
git add next-app/app/page.tsx next-app/app/page.test.tsx next-app/app/homepage-slideshow.tsx
git commit -m "feat: render all homepage projects"
```

---

### Task 3: Gate slideshow media work by viewport activity

**Files:**
- Create: `next-app/app/use-homepage-viewport.ts`
- Create: `next-app/app/use-homepage-viewport.test.ts`
- Modify: `next-app/app/homepage-slideshow.tsx`
- Modify: `next-app/app/homepage-slideshow.test.tsx`

**Interfaces:**
- Produces: `useHomepageViewport<T extends Element>(): { ref: RefObject<T | null>; isVisible: boolean; isNearViewport: boolean }`.
- Produces: `videoMotionAttributes(prefersReducedMotion: boolean, isVisible: boolean): { autoPlay: boolean; loop: boolean }`.
- Consumes: `priority?: boolean` from Task 2.

- [ ] **Step 1: Write tests for viewport defaults and motion/loading policy**

Extract and test a pure fallback state beside the hook:

```ts
expect(viewportFallback(false)).toEqual({ isVisible: false, isNearViewport: false });
expect(viewportFallback(true)).toEqual({ isVisible: true, isNearViewport: true });
expect(videoMotionAttributes(false, false)).toEqual({ autoPlay: false, loop: true });
expect(videoMotionAttributes(false, true)).toEqual({ autoPlay: true, loop: true });
expect(videoMotionAttributes(true, true)).toEqual({ autoPlay: false, loop: false });
```

Update static markup expectations so the first image is eager only with `priority: true`, a non-priority image is lazy, and control labels include the project name:

```ts
expect(render(project, true)).toContain('loading="eager"');
expect(render(project, false)).toContain('loading="lazy"');
expect(render(project, true)).toContain('aria-label="Previous ARCTERYX image"');
expect(render(project, true)).toContain('aria-label="Next ARCTERYX image"');
```

- [ ] **Step 2: Run the slideshow and viewport tests and confirm they fail**

Run: `npm test -- next-app/app/homepage-slideshow.test.tsx next-app/app/use-homepage-viewport.test.ts`

Expected: FAIL because the hook, two-argument motion policy, loading policy, and contextual labels do not exist.

- [ ] **Step 3: Implement the two-observer viewport hook**

Create `use-homepage-viewport.ts` with one observer at `threshold: 0.25` for playback visibility and one at `rootMargin: "100% 0px"` for nearby preloading:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

export const viewportFallback = (observerSupported: boolean) =>
  observerSupported
    ? { isVisible: false, isNearViewport: false }
    : { isVisible: true, isNearViewport: true };

export function useHomepageViewport<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      const fallback = viewportFallback(false);
      setIsVisible(fallback.isVisible);
      setIsNearViewport(fallback.isNearViewport);
      return;
    }

    const visibleObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    const nearbyObserver = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: "100% 0px" }
    );
    visibleObserver.observe(element);
    nearbyObserver.observe(element);
    return () => {
      visibleObserver.disconnect();
      nearbyObserver.disconnect();
    };
  }, []);

  return { ref, isVisible, isNearViewport };
}
```

- [ ] **Step 4: Connect visibility, playback, preloading, and image priority**

Attach the returned `ref` to `<figure>`. Change neighbour preloading to return unless `isNearViewport`. Change video playback to pause when either reduced motion is enabled or the slideshow is not visible:

```ts
if (prefersReducedMotion || !isVisible) {
  video.pause();
  return;
}
video.play().catch(() => {});
```

Use `videoMotionAttributes(prefersReducedMotion, isVisible)`, `loading={priority ? "eager" : "lazy"}`, and contextual labels:

```tsx
aria-label={`Previous ${project.displayName} image`}
aria-label={`Next ${project.displayName} image`}
```

- [ ] **Step 5: Run the focused slideshow tests**

Run: `npm test -- next-app/app/homepage-slideshow.test.tsx next-app/app/use-homepage-viewport.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit viewport-aware slideshow behaviour**

```bash
git add next-app/app/use-homepage-viewport.ts next-app/app/use-homepage-viewport.test.ts next-app/app/homepage-slideshow.tsx next-app/app/homepage-slideshow.test.tsx
git commit -m "feat: gate homepage media by viewport"
```

---

### Task 4: Prevent project metadata and media collisions

**Files:**
- Modify: `next-app/app/globals.css`
- Test: `next-app/app/page.test.tsx`

**Interfaces:**
- Consumes: `.homepage-project__name`, `.homepage-hero`, and `.homepage-project__category` siblings from Task 2.
- Produces: a three-track one-column-feed panel above 700px and the existing stacked mobile panel at 700px and below.

- [ ] **Step 1: Add structural regression assertions for the grid children**

Assert each project renders name, slideshow, and category in that source order:

```ts
const firstProject = markup.slice(
  markup.indexOf('id="homepage-project-arcteryx-title"'),
  markup.indexOf('id="homepage-project-second-title"')
);
expect(firstProject.indexOf("homepage-project__name")).toBeLessThan(
  firstProject.indexOf("homepage-hero")
);
expect(firstProject.indexOf("homepage-hero")).toBeLessThan(
  firstProject.indexOf("homepage-project__category")
);
```

- [ ] **Step 2: Replace absolute metadata with collision-safe grid tracks**

For widths above 700px, use:

```css
.homepage-project {
  grid-template-columns: minmax(max-content, 1fr) minmax(0, 800px) minmax(max-content, 1fr);
  column-gap: var(--homepage-gutter);
  align-items: center;
}

.homepage-hero {
  grid-column: 2;
  width: 100%;
  aspect-ratio: 1.6;
  height: auto;
  max-height: 75dvh;
}

.homepage-project__name,
.homepage-project__category {
  position: static;
  transform: none;
  min-width: 0;
}

.homepage-project__name { grid-column: 1; justify-self: start; }
.homepage-project__category { grid-column: 3; justify-self: end; }
```

Retain the 700px stacked mobile layout, its 10px media/title gap, and hidden mobile category. Remove redundant mobile resets made obsolete by the desktop rules.

- [ ] **Step 3: Run page and slideshow regressions**

Run: `npm test -- next-app/app/page.test.tsx next-app/app/homepage-slideshow.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit the responsive layout**

```bash
git add next-app/app/globals.css next-app/app/page.test.tsx
git commit -m "fix: prevent homepage feed collisions"
```

---

### Task 5: Verify parity and record durable evidence

**Files:**
- Create: `docs/evidence/issue-69/README.md`
- Create: `docs/evidence/issue-69/desktop-next.png`
- Create: `docs/evidence/issue-69/desktop-static.png`
- Create: `docs/evidence/issue-69/tablet-next.png`
- Create: `docs/evidence/issue-69/tablet-static.png`
- Create: `docs/evidence/issue-69/mobile-next.png`
- Create: `docs/evidence/issue-69/mobile-static.png`
- Modify if failures require it: files from Tasks 1–4 only

**Interfaces:**
- Consumes: the complete homepage implementation from Tasks 1–4.
- Produces: build/test proof and reviewable desktop, tablet, and mobile evidence linked from PR #69 work.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all Vitest files and tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Next.js production build completes with `/` and `/projects/[slug]` compiled successfully.

- [ ] **Step 3: Start the production server and verify delivery**

Run: `npm start -- --hostname 127.0.0.1 --port 3000`

Run in another terminal: `curl -I http://127.0.0.1:3000/`

Expected: `HTTP/1.1 200 OK` with no Storyblok credential in the response headers or HTML.

- [ ] **Step 4: Capture representative browser evidence**

Capture the current static baseline and complete Next homepage at 1440x1000, 1024x768, and 390x844. Save each pair to the six exact paths listed above. Verify at each width:

- Information remains above Work and no separate footer follows the projects.
- All visible projects appear in Storyblok order with correct names, categories, and media.
- Landscape and portrait media remain contained.
- Project names/categories do not collide with media.
- Keyboard focus is visible and previous/next controls change only their own slideshow.
- Touch/pointer navigation works, single-slide controls are absent, and reduced motion prevents autoplay.

- [ ] **Step 5: Write the evidence index**

Create `docs/evidence/issue-69/README.md` using this structure after every listed check passes:

```md
# Issue #69 homepage parity evidence

Tested immediately before the evidence commit.

## Automated verification

- `npm test`: PASS
- `npm run build`: PASS

## Visual comparison

| Viewport | Static baseline | Next.js implementation |
| --- | --- | --- |
| 1440x1000 | [desktop-static.png](desktop-static.png) | [desktop-next.png](desktop-next.png) |
| 1024x768 | [tablet-static.png](tablet-static.png) | [tablet-next.png](tablet-next.png) |
| 390x844 | [mobile-static.png](mobile-static.png) | [mobile-next.png](mobile-next.png) |

## Content and interaction checks

- Project order: ARCTERYX → Aesop → Jak Architecture → alt. cosmetics → Albus Lumen → AP—REPS
- Pointer controls: PASS — each control changes only its own slideshow.
- Keyboard controls and visible focus: PASS — Left/Right changes the focused slideshow and focus is visible.
- Touch swipe: PASS — horizontal swipe changes the active project slide without blocking vertical scroll.
- Single-slide controls: PASS — no previous/next focus targets render.
- Reduced-motion video playback: PASS — videos remain paused and slide transitions do not animate.
- Metadata/media collisions: PASS — no collisions at 1440x1000, 1024x768, or 390x844.

Information is the homepage footer-equivalent and no separate footer is rendered.
```

- [ ] **Step 6: Re-run cleanliness and regression checks**

Run: `git diff --check && npm test && npm run build`

Expected: no whitespace errors; full test suite and production build pass.

- [ ] **Step 7: Commit the parity record**

```bash
git add docs/evidence/issue-69
git commit -m "docs: record homepage feed parity"
```
