# Next.js and Storyblok Ticket Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert GitHub issues #56–#66 into a nested, dependency-aware roadmap, add the current-site reliability work that must run alongside the migration, and make every leaf issue ready to implement without additional architecture decisions.

**Architecture:** Keep #67 as the program parent and #56–#66 as stable roadmap workstreams, with #81 as an additional direct reliability slice. Storyblok owns content and media references, Cloudinary owns primarily video/media delivery, and Next.js is the frontend. Add native GitHub sub-issues only beneath broad workstreams, reuse #45 for the second-site launch, and use native blocker relationships plus matching Markdown references.

**Tech Stack:** GitHub Issues, GitHub GraphQL sub-issue and dependency mutations, GitHub Pages, Storyblok, Cloudinary, Next.js, `gh` CLI, Markdown.

## Global Constraints

- Keep the current static site intact and reliably deployable until the production cutover ticket is complete.
- Treat the current homepage as the visual baseline; do not combine the migration with a redesign.
- Preserve vertical document scrolling and verify slideshow controls; do not revive the reverted transform-based horizontal rail.
- Remove Experience rather than migrating it.
- Require media performance work before production cutover.
- Use Storyblok for content, editorial metadata, and stable Cloudinary references; use Cloudinary for primarily video/media delivery; use Next.js as the frontend.
- Configure and prove Cloudinary with one real video before the downstream media implementation slices begin.
- Keep `/crm` outside the public portfolio migration.
- Use `epic` for roadmap parents and `dev` plus `kspf.au` for executable tickets.
- Apply the `Portfolio` milestone to all tickets in this scope.

---

### Task 1: Standardise directly executable roadmap tickets

**Tracker records:**
- Update: GitHub issues #56, #58, #59, #60, #61, and #64.

**Interfaces:**
- Consumes: parent #67 and the existing native blocker graph.
- Produces: six leaf tickets with `Parent`, `What to build`, checklist acceptance criteria, and `Blocked by` sections.

- [ ] **Step 1: Rewrite #56 as the isolated Next.js foundation**

Keep its existing behavior, but explicitly require a clean Next.js App Router page, TypeScript, plain CSS, environment examples without secrets, build/dev commands, a smoke test, and proof that the existing deployment files are untouched. Set `Blocked by` to `None - can start immediately`.

- [ ] **Step 2: Rewrite #58 as one published-and-draft Storyblok tracer**

Require one real homepage story to render through a typed server-side Storyblok boundary in both published and draft preview modes. Require secret protection, a Visual Editor refresh path, tests, and local setup documentation. Set `Blocked by` to #56.

- [ ] **Step 3: Rewrite #59 as a composable homepage tracer**

Require a migration-safe `page` model with ordered `information`, `navigation`, and `project_feed` blocks, a React resolver, current homepage content migrated once, reordering proof, and coexistence with the legacy schema until cutover. Set `Blocked by` to #57 and #58.

- [ ] **Step 4: Rewrite #60 as the vertical scroll interaction**

Require Information before Navigation and Portfolio in the DOM, initial focus around Navigation without a visible jump, anchor/history/reduced-motion behavior, no fixed overlay or transformed rail, and desktop/mobile verification including slideshow controls. Set `Blocked by` to #59.

- [ ] **Step 5: Rewrite #61 as one data-preserving layout variant**

Require one-column and three-column rendering from the same `project_feed` data, Storyblok selection, stable ordering, content-aware responsive collapse, and desktop/mobile regression checks. Set `Blocked by` to #59.

- [ ] **Step 6: Rewrite #64 as the complete Experience removal**

Require deletion from HTML/JavaScript, navigation, Storyblok schema/seed/delivery/preview, generated content, tests, and docs while the current homepage and legacy sync still pass. Set `Blocked by` to `None - can start immediately`.

- [ ] **Step 7: Apply metadata**

Apply labels `dev` and `kspf.au` and milestone `Portfolio` to all six issues.

### Task 2: Decompose #57 into homepage parity slices

**Tracker records:**
- Update: GitHub issue #57.
- Create: two native sub-issues beneath #57.

**Interfaces:**
- Consumes: the Next.js foundation from #56.
- Produces: a verified Next.js homepage baseline used by #59, #65, and #66.

- [ ] **Step 1: Create `Port the homepage shell and first project to Next.js at visual parity`**

Body requirements:
- Parent: #57.
- What to build: render the homepage shell, Navigation, Information, the first real project, and one functional slideshow in Next.js using current content and CSS values.
- Acceptance: first project order/content matches production; slideshow previous/next and keyboard controls work; desktop and mobile comparison recorded; reduced motion is respected; build and focused tests pass; static production remains unchanged.
- Blocked by: #56.

- [ ] **Step 2: Create `Complete the Next.js homepage feed and parity checks`**

Body requirements:
- Parent: #57.
- What to build: render every remaining project and the footer/content required for full homepage parity, using the component boundaries proved by the first slice.
- Acceptance: all projects are present in the same order; all slideshows work on desktop/mobile; typography/spacing/navigation match the baseline; accessibility regression checks pass; side-by-side parity evidence is recorded; build passes.
- Blocked by: the first #57 child.

- [ ] **Step 3: Wire and label the workstream**

Add both children as native sub-issues of #57, add their native blocker relationships, label #57 with `epic` and `kspf.au`, label both children with `dev` and `kspf.au`, and apply milestone `Portfolio` to all three.

### Task 3: Decompose #62 into project-page vertical slices

**Tracker records:**
- Update: GitHub issue #62.
- Create: three native sub-issues beneath #62.

**Interfaces:**
- Consumes: direct Storyblok integration from #58 and the composable page system from #59.
- Produces: project routes and reusable blocks used by the multi-site workstream.

- [ ] **Step 1: Create `Ship a Storyblok project page with header, text, and media blocks`**

Require a dynamic project route, stable project metadata, ordered body blocks, `project_header`, `text`, and `media` renderers, one existing project migrated end-to-end, missing-project handling, and build/tests. Blocked by #58 and #59.

- [ ] **Step 2: Create `Add gallery and slideshow blocks to Storyblok project pages`**

Require gallery and slideshow blocks on the migrated project, Storyblok ordering, responsive media, keyboard controls, reduced motion, empty/single-item handling, and tests. Blocked by the core project-page child.

- [ ] **Step 3: Create `Add two-column and embed blocks to Storyblok project pages`**

Require two-column and embed blocks on a real project, safe embed handling, mobile stacking, absent/invalid embed fallback, Storyblok ordering, and tests. Blocked by the core project-page child.

- [ ] **Step 4: Wire and label the workstream**

Add native sub-issue and blocker relationships. Label #62 with `epic` and `kspf.au`; label the children with `dev` and `kspf.au`; apply milestone `Portfolio`.

### Task 4: Decompose #63 and reuse the existing second-site ticket

**Tracker records:**
- Update: GitHub issues #63 and #45.
- Create: one new native sub-issue beneath #63.

**Interfaces:**
- Consumes: composable pages from #59, project pages from #62, and the deployment platform from #65.
- Produces: shared multi-site configuration and the first additional live portfolio hostname.

- [ ] **Step 1: Create `Resolve Storyblok site configuration by hostname`**

Require two site records, hostname-to-site resolution, independent homepage/navigation/metadata selection, shared project references, explicit unknown-host behavior, local tests for both hostnames, and documentation. Blocked by #59 and #62.

- [ ] **Step 2: Rewrite #45 as `Launch rowan.kspf.au from the shared portfolio platform`**

Require the existing UX portfolio issue to use the shared codebase and Storyblok records, select its own homepage/navigation/metadata, reuse projects without duplication, configure HTTPS/canonical metadata, and verify the live hostname. Blocked by the hostname-resolution child and #65.

- [ ] **Step 3: Wire and label the workstream**

Nest the new child and #45 under #63. Label #63 with `epic` and `kspf.au`; label both children with `dev` and `kspf.au`; apply milestone `Portfolio`.

### Task 5: Decompose #65 into reversible deployment slices

**Tracker records:**
- Update: GitHub issue #65.
- Create: three native sub-issues beneath #65.

**Interfaces:**
- Consumes: homepage parity, Storyblok, composable home, Experience removal, and media performance workstreams.
- Produces: a validated deployment, live cutover, and eventual removal of the compatibility layer.

- [ ] **Step 1: Create `Deploy the Next.js and Storyblok build to a production-like preview`**

Require the chosen deployment target, clean-checkout build, published and draft Storyblok paths, preview URL, redirects/canonical checks, environment variable documentation, and no change to `kspf.au`. Blocked by #57, #58, #59, #64, and #66.

- [ ] **Step 2: Create `Switch kspf.au to the validated Next.js deployment`**

Require a written rollback point, domain/DNS switch, HTTPS, canonical/redirect validation, homepage parity, CMS publish/preview checks, mobile/desktop smoke tests, and monitoring immediately after cutover. Blocked by the production-like preview child.

- [ ] **Step 3: Create `Remove the legacy static deployment and CMS compatibility code`**

Require reference checks before deleting the GitHub Pages/static workflow, generated Storyblok JSON path, sync/prerender scripts, Decap admin, obsolete root HTML/JavaScript and duplicated assets; preserve `/crm`; update setup/deployment docs; run tests/build from a clean checkout. Blocked by the live cutover child.

- [ ] **Step 4: Wire and label the workstream**

Add native sub-issue and blocker relationships. Label #65 with `epic` and `kspf.au`; label the children with `dev` and `kspf.au`; apply milestone `Portfolio`.

### Task 6: Add the current GitHub Pages reliability slice

**Tracker records:**
- Create: GitHub issue #81 as a direct native sub-issue of #67.

**Interfaces:**
- Consumes: the current `main` → workflow → `gh-pages` deployment path.
- Produces: a verified Pages deployment and deterministic cache invalidation that remain in service until #65 completes cutover.

- [ ] **Step 1: Create `Make the current GitHub Pages deployment reliable during migration`**

Require a successful `main` build to trigger and verify the Pages deployment of the exact generated `gh-pages` commit; prevent production/preview branch-write races; preserve the custom domain, CNAME, and HTTPS behavior; add deterministic HTML/CSS/JavaScript/generated-content cache invalidation; verify the live revision; and document retry/recovery. Set `Blocked by` to `None - can start immediately`.

- [ ] **Step 2: Wire and label the reliability slice**

Add #81 directly beneath #67, label it with `dev` and `kspf.au`, and apply milestone `Portfolio`. Keep it independent of #65 because it protects the live site during, rather than after, the migration.

### Task 7: Decompose #66 into media delivery slices

**Tracker records:**
- Update: GitHub issue #66.
- Create: four native sub-issues beneath #66.

**Interfaces:**
- Consumes: the Next.js foundation from #56, homepage implementation from #57, direct Storyblok data from #58, and final homepage composition from #59.
- Produces: a decided and proven Cloudinary boundary, image/video delivery, and a repeatable release performance gate used by #65.

- [ ] **Step 1: Create `Configure Cloudinary and deliver one portfolio video end-to-end`**

Require secure Cloudinary configuration, asset naming/folder/versioning conventions, stable Cloudinary references plus editorial metadata in Storyblok, one shared Next.js media resolver, one real video in published and draft paths, derived web variants and poster, invalid-reference fallback, and a migration/rollback procedure. Blocked by #56 and #58.

- [ ] **Step 2: Create `Serve responsive portfolio images through the Storyblok–Cloudinary boundary`**

Require Storyblok editorial metadata and stable Cloudinary references, width/height/aspect ratio without client probing, Cloudinary responsive variants, first-viewport priority, lazy loading for later images, desktop/mobile network verification, and accessibility preservation. Blocked by #57 and the Cloudinary foundation slice.

- [ ] **Step 3: Create `Gate Cloudinary portfolio video loading by viewport and intent`**

Require every production portfolio video to resolve from Storyblok through the shared Next.js media boundary and be delivered by Cloudinary, not GitHub or Storyblok. Require Cloudinary web variants and posters, no heavy request before viewport proximity or intent, accessible controls/fallback, desktop/mobile network verification, cache-safe replacement behavior, and slideshow regression checks. Blocked by #57 and the Cloudinary foundation slice.

- [ ] **Step 4: Create `Enforce desktop and mobile media performance budgets before cutover`**

Require a repeatable performance command or CI job, a documented representative homepage scenario, checks that the initial load does not request every media asset or bypass the agreed Cloudinary transformations, recorded desktop/mobile budgets, actionable failures, and a passing baseline. Blocked by the image child, video child, and #59.

- [ ] **Step 5: Correct the #66 dependency graph and metadata**

Set #66 to be blocked by #57 and #58. Order the Cloudinary foundation first; make the image and video slices depend on it; then make the performance gate depend on those implementation slices and #59. Label #66 with `epic` and `kspf.au`; label the children with `dev` and `kspf.au`; apply milestone `Portfolio`.

### Task 8: Align roadmap metadata and verify the live graph

**Tracker records:**
- Update metadata: #56–#67, #81, and every new/reused child.
- Read/verify: native parent, sub-issue, blocker, labels, milestone, title, and body fields.

**Interfaces:**
- Consumes: all prior tracker updates.
- Produces: the final work-ready roadmap.

- [ ] **Step 1: Apply roadmap metadata**

Label #67 and the nested workstream parents #57, #62, #63, #65, and #66 with `epic` and `kspf.au`. Apply milestone `Portfolio` to #56–#67, #81, and all nested children.

- [ ] **Step 2: Verify hierarchy**

Run a GraphQL query and confirm #67 has exactly #56–#66 plus #81 as direct children; #57, #62, #63, and #65 have the planned nested children; #66 has #82 first followed by #78, #79, and #77; and #45 has parent #63.

- [ ] **Step 3: Verify dependencies**

Query every new leaf issue and compare its `blockedBy` list with this plan. Confirm #65 remains blocked by #57, #58, #59, #64, and #66; #66 is blocked by #57 and #58; #82 is blocked by #56 and #58; #78 and #79 are blocked by #57 and #82; and #81 has no blockers.

- [ ] **Step 4: Verify issue readiness**

Confirm every leaf issue contains `## Parent`, `## What to build`, checkbox acceptance criteria, and `## Blocked by`; every leaf has `dev` and `kspf.au`; every roadmap parent has `epic` and `kspf.au`; and all are in milestone `Portfolio`.

- [ ] **Step 5: Verify repository state and commit the plan**

Run `node --test scripts/tests/*.test.mjs`, inspect `git status --short`, stage only the scope design and plan, and commit the review-driven architecture amendments.
