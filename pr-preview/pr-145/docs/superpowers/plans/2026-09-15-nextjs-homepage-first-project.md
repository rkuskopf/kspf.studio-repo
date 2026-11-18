# Next.js Homepage First Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Next.js `/` tracer with the current Storyblok-backed homepage shell and first visible production project at visual and interaction parity.

**Architecture:** A server-only aggregate loader fetches home, site, and ordered project stories under one resolved Storyblok version. Server components render semantic shell content, while one small client component manages slideshow state and input. Homepage styles are scoped away from the existing project detail route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, Storyblok Delivery API, Vitest

## Global Constraints

- Do not modify the static root homepage or its deployment behaviour.
- Render only the first visible ordered production project in issue #68; leave the remaining feed and footer for issue #69.
- Keep Storyblok delivery credentials server-only and redact them from errors and markup.
- Preserve the current Storyblok and Cloudinary media references without uploading or migrating assets.
- Use test-first red-green cycles for every production behaviour.

---

### Task 1: Map homepage site and project content

**Files:**
- Modify: `next-app/lib/storyblok/types.ts`
- Modify: `next-app/lib/storyblok/delivery.ts`
- Modify: `next-app/lib/storyblok/delivery.test.ts`

**Interfaces:**
- Produces: `SiteContent`, `HomepageProject`, `fetchSiteContent(options)`, and `fetchHomepageProjects(options)`.
- `fetchHomepageProjects` returns visible projects sorted by numeric `content.order`, then Storyblok `position`.

- [ ] **Step 1: Write failing delivery tests** using complete Storyblok fixtures for site navigation/information and two projects with reversed API order, Storyblok asset and `legacy_url` slides, and one hidden project. Assert hand-written mapped output and URL query parameters.
- [ ] **Step 2: Run `npm test -- next-app/lib/storyblok/delivery.test.ts`** and confirm failures name the missing exports/types.
- [ ] **Step 3: Add the focused types and strict mappers**. Reuse the existing Storyblok base URL and credential checks, validate HTTPS media, and never include request URLs or tokens in errors.
- [ ] **Step 4: Run the focused delivery test** and confirm it passes.

### Task 2: Load the homepage aggregate under one delivery version

**Files:**
- Modify: `next-app/lib/storyblok/server.ts`
- Modify: `next-app/lib/storyblok/server.test.ts`
- Modify: `next-app/lib/storyblok/types.ts`

**Interfaces:**
- Consumes: `fetchHomeContent`, `fetchSiteContent`, and `fetchHomepageProjects`.
- Produces: `loadHomePage(...) => Promise<HomePageData>` with `{ content, site, project, isPreview }`.

- [ ] **Step 1: Extend server tests** so the recorder returns distinct fixtures for `/stories/home`, `/stories/site`, and `/stories`, then assert all three requests use the same published or draft version/token/cache version and the first ordered visible project is returned.
- [ ] **Step 2: Run `npm test -- next-app/lib/storyblok/server.test.ts`** and confirm the new aggregate assertions fail against the tracer loader.
- [ ] **Step 3: Fetch the three resources in parallel** after resolving the request version once, require at least one visible project, and return the expanded typed result.
- [ ] **Step 4: Run the focused server test** and confirm it passes.

### Task 3: Build the slideshow interaction boundary

**Files:**
- Create: `next-app/app/homepage-slideshow.tsx`
- Create: `next-app/app/homepage-slideshow.test.tsx`

**Interfaces:**
- Consumes: `HomepageProject`.
- Produces: `HomepageSlideshow({ project })` and exported pure `nextSlideIndex(current, delta, length)` for interaction-state verification.

- [ ] **Step 1: Write failing tests** for forward/back wrapping, image/video markup, accessible previous/next labels, meaningful image alt text, and controls being absent for one slide.
- [ ] **Step 2: Run `npm test -- next-app/app/homepage-slideshow.test.tsx`** and confirm failure because the client component does not exist.
- [ ] **Step 3: Implement the minimal client component** with button clicks, `ArrowLeft`/`ArrowRight`, horizontal touch-pointer swipe, adjacent image preloading, muted looping inline video, and reduced-motion-aware transition state.
- [ ] **Step 4: Run the focused slideshow tests** and confirm they pass.

### Task 4: Render and style the homepage tracer slice

**Files:**
- Modify: `next-app/app/page.tsx`
- Modify: `next-app/app/page.test.tsx`
- Modify: `next-app/app/globals.css`
- Modify: `next-app/app/layout.tsx`

**Interfaces:**
- Consumes: expanded `HomePageData` and `HomepageSlideshow`.
- Produces: semantic Information, Navigation, and Work markup at `/`.

- [ ] **Step 1: Replace tracer expectations with failing markup tests** for information hierarchy, mail link, primary navigation targets, project display name/category, preview bridge, and absence of credentials.
- [ ] **Step 2: Run `npm test -- next-app/app/page.test.tsx`** and confirm those expectations fail against the tracer markup.
- [ ] **Step 3: Implement semantic server markup** with Information before Work, current navigation labels, the first project slideshow, and preview bridge only for draft delivery.
- [ ] **Step 4: Port the approved homepage values into scoped CSS** including 15px gutters, desktop metadata placement, media constraints, mobile media/title alignment with 10px gap, visible focus, and reduced-motion overrides. Set the layout metadata to current KSPF copy.
- [ ] **Step 5: Run the focused page and slideshow tests** and confirm they pass.

### Task 5: Verify parity and branch integrity

**Files:**
- Modify only if verification reveals an issue in the files above.

**Interfaces:**
- Produces: evidence that the Next.js slice meets issue #68 without changing the static site.

- [ ] **Step 1: Run `npm test`** and require zero failures.
- [ ] **Step 2: Run `npm run build`** with configured Storyblok delivery environment and require a successful production build.
- [ ] **Step 3: Run the Next dev server and compare `/` at representative desktop and mobile viewports** against the current Storyblok/static homepage, checking hierarchy, positions, media bounds, controls, keyboard input, focus, and reduced motion.
- [ ] **Step 4: Run `git diff --check` and `git status --short`**; confirm no static root homepage or deployment file changed.
- [ ] **Step 5: Review the issue #68 acceptance criteria line by line** and report any remaining gap instead of claiming completion.
