# Storyblok Project-Page Tracer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the canonical Storyblok `project` record so one fresh, opted-in `product-design-tracer` story renders a typed Next.js page from ordered header, rich-text, and media blocks.

**Architecture:** Keep the #58 signed-preview, server-only delivery, and token-free Bridge boundaries. Add an isolated project delivery/validation module, a typed block renderer that uses `@storyblok/react` only for RSC rich text, and a dedicated additive management migration that merges fields into the live `project` component without writing any existing project story.

**Status:** Tasks 1–6 are complete. The real Storyblok migration, draft review, publication, and PR update remain explicitly scoped to Tasks 7–8.

**Tech Stack:** Next.js 16.3.3 App Router, React 19.2.8, TypeScript 7.0.2, Vitest 4.1.11, Node.js test runner, Storyblok Content Delivery and Management APIs, `@storyblok/react` 7.3.1.

## Global Constraints

- Preserve every existing `project` field, value, and static homepage-preview behavior.
- `project` is canonical; do not create a competing page content type.
- Existing projects remain unroutable unless `page_enabled === true`.
- Do not read from, migrate, or modify Aesop, `case_study`, or `case-studies/`.
- Create only `projects/product-design-tracer`, with `show_on_home: false`.
- Enabled pages require non-empty `title`, `page_enabled === true`, and a valid ordered body with exactly one `project_header`.
- `client`, `year`, `discipline`, `thumbnail`, and `tags` are optional metadata.
- `media.alt` is optional in Storyblok and required by the mapper only for images.
- Media type is decided by a pure MIME/extension classifier; disagreements and unsupported assets fail closed.
- Issue #82 owns Cloudinary references, transforms, variants, dimensions, and loading policy.
- Add `@storyblok/react` explicitly and use only `StoryblokServerRichText`; keep #58 delivery/auth/Bridge code.
- Keep management credentials outside `next-app/` and tokens out of browser code, markup, logs, and errors.
- The management migration defaults to dry-run, adds fields, creates only the tracer draft, and publishes separately.
- Keep the static production site and GitHub Pages workflows unchanged.
- Continue on PR #88's `codex/72-storyblok-project-page` branch; do not merge it.

---

### Task 1: Add the additive schema and React dependency

**Files:**
- Create: `scripts/storyblok-project-page-schema.mjs`
- Create: `scripts/tests/storyblok-project-page-schema.test.mjs`
- Modify: `scripts/storyblok-schema.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `PROJECT_PAGE_COMPONENTS`, `PROJECT_PAGE_FIELDS`, and `PROJECT_PAGE_COMPONENT_NAMES`.
- Preserves: the first nine existing `project` schema fields exactly.
- Provides: `@storyblok/react@7.3.1` for Task 5.

- [x] **Step 1: Write the failing schema test**

Create `scripts/tests/storyblok-project-page-schema.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { STORYBLOK_COMPONENTS } from "../storyblok-schema.mjs";

const byName = new Map(STORYBLOK_COMPONENTS.map((value) => [value.name, value]));

test("extends project without changing legacy fields", () => {
  const schema = byName.get("project").schema;
  assert.deepEqual(Object.keys(schema).slice(0, 9), [
    "title", "display_name", "category", "description", "view_url",
    "slides", "alt", "show_on_home", "order",
  ]);
  assert.equal(schema.page_enabled.default_value, "false");
  assert.deepEqual(schema.body.component_whitelist, ["project_header", "text", "media"]);
});

test("defines the initial project-page blocks", () => {
  assert.equal(byName.get("project_tag").schema.label.required, true);
  assert.deepEqual(byName.get("project_header").schema, {});
  assert.equal(byName.get("text").schema.content.type, "richtext");
  assert.equal(byName.get("media").schema.asset.allow_external_url, true);
  assert.equal(byName.get("media").schema.alt.required, undefined);
});
```

- [x] **Step 2: Confirm RED**

Run `node --test scripts/tests/storyblok-project-page-schema.test.mjs`.
Expected: FAIL because the new fields and components do not exist.

- [x] **Step 3: Define the reusable page schema**

Create `scripts/storyblok-project-page-schema.mjs` with local `field` and `blocks` helpers. Export four nestable components:

- `project_tag`: required text `label`, preview field `label`.
- `project_header`: empty schema marker.
- `text`: required Richtext `content`.
- `media`: required image/video Asset `asset` with external URLs, optional text `alt`, optional textarea `caption`.

Export these additive fields with positions 9–15:

```js
export const PROJECT_PAGE_FIELDS = {
  client: field("text", "Client", 9),
  year: field("text", "Year", 10),
  discipline: field("text", "Discipline", 11),
  thumbnail: field("asset", "Thumbnail", 12, {
    filetypes: ["images"], allow_external_url: true,
  }),
  tags: blocks("Tags", 13, "project_tag"),
  page_enabled: field("boolean", "Enable project page", 14, {
    default_value: "false",
  }),
  body: blocks("Project page body", 15, ["project_header", "text", "media"]),
};
```

- [x] **Step 4: Extend the checked-in component list**

Import and spread the four components into `STORYBLOK_COMPONENTS`. Spread `PROJECT_PAGE_FIELDS` after `order` in the existing `project.schema`. Do not rewrite a legacy field.

- [x] **Step 5: Install the explicit SDK version**

Run `npm install @storyblok/react@7.3.1 --save`. Confirm existing direct dependency versions are unchanged.

- [x] **Step 6: Confirm GREEN**

Run:

```sh
node --test scripts/tests/storyblok-project-page-schema.test.mjs
node scripts/verify-storyblok.mjs
```

- [x] **Step 7: Commit**

```sh
git add package.json package-lock.json scripts/storyblok-schema.mjs scripts/storyblok-project-page-schema.mjs scripts/tests/storyblok-project-page-schema.test.mjs
git commit -m "feat: define Storyblok project page schema"
```

---

### Task 2: Build the dry-run-first management migration

**Files:**
- Create: `scripts/storyblok-project-page-migration.mjs`
- Create: `scripts/setup-project-page.mjs`
- Create: `scripts/tests/storyblok-project-page-migration.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 schema constants.
- Produces: `mergeProjectPageFields`, `buildProductDesignTracer`, `runProjectPageMigration`, and `createStoryblokManagementApi`.
- CLI: `npm run storyblok:project-page`, with mutually exclusive `--apply` and `--publish`.

- [x] **Step 1: Write failing migration tests**

Use an in-memory API recorder and assert:

```js
test("dry run plans changes without writes", async () => {
  const api = fakeApi({ components: legacyComponents, stories: [projectsFolder] });
  const result = await runProjectPageMigration({ api, mode: "plan", uid });
  assert.equal(api.writes.length, 0);
  assert.deepEqual(result.actions.map(({ kind }) => kind), [
    "create-component", "create-component", "create-component", "create-component",
    "update-project-component", "create-tracer-draft",
  ]);
});

test("apply creates only the tracer story", async () => {
  const api = fakeApi({ components: legacyComponents, stories: [projectsFolder] });
  await runProjectPageMigration({ api, mode: "apply", uid });
  assert.deepEqual(api.storyCreates.map(({ story }) => story.slug), ["product-design-tracer"]);
  assert.equal(api.storyUpdates.length, 0);
  assert.equal(api.publishes.length, 0);
});
```

Also prove reruns are write-free; conflicts in new fields or same-named components fail; existing non-tracer stories never receive a write; an altered existing tracer refuses replacement; publish refuses absent/unverified tracers; publish calls only the exact tracer ID; `--apply --publish` fails; output contains no token or credential URL.

- [x] **Step 2: Confirm RED**

Run `node --test scripts/tests/storyblok-project-page-migration.test.mjs`.

- [x] **Step 3: Build the exact tracer**

Export:

```js
export const TRACER_FULL_SLUG = "projects/product-design-tracer";
export const TRACER_ASSET_URL =
  "https://raw.githubusercontent.com/rkuskopf/kspf.studio-repo/main/assets/flav/Frame%2019.png";
```

`buildProductDesignTracer(uid)` returns one `project` story with preview fields, `show_on_home: false`, optional metadata populated with client `KSPF`, year `2026`, discipline `Product design`, ordered `Tracer`/`Prototype` tags, `page_enabled: true`, empty thumbnail, and body order `project_header`, `text`, `media`. The text is:

> This minimal Storyblok project verifies the canonical project record, ordered blocks, and draft preview path.

The media Asset uses `TRACER_ASSET_URL`, `fieldtype: "asset"`, and alt `KSPF brand mark`; it uploads nothing.

- [x] **Step 4: Implement additive planning**

`mergeProjectPageFields(existingComponent)` deep-clones the full component, validates any already-present approved field, appends absent fields, preserves unknown component settings and legacy schema objects, and returns `{ component, changed }`.

`runProjectPageMigration({ api, mode, uid })` reads components/stories, validates the existing `project` component and `projects/` folder, creates missing nestable components first, updates only the `project` component, creates the tracer draft only when absent, and never calls update-story. `publish` requires an exact existing tracer and calls only `stories/:id/publish`.

- [x] **Step 5: Implement the client and CLI**

Require numeric `STORYBLOK_SPACE_ID`, `STORYBLOK_MANAGEMENT_TOKEN`, and a supported region. Provide paginated reads plus component create/update, story create, and story publish. Errors name status/method/resource without URL, response body, or token.

Parse flags as:

```js
if (flags.has("--apply") && flags.has("--publish")) {
  throw new Error("Use --apply and --publish as separate verified steps.");
}
const mode = flags.has("--apply") ? "apply" : flags.has("--publish") ? "publish" : "plan";
```

Add `"storyblok:project-page": "node scripts/setup-project-page.mjs"` to package scripts.

- [x] **Step 6: Confirm GREEN**

Run:

```sh
node --test scripts/tests/storyblok-project-page-migration.test.mjs
npm run storyblok:project-page
```

The test passes; the unconfigured CLI names the missing variable without a value.

- [x] **Step 7: Commit**

```sh
git add package.json scripts/storyblok-project-page-migration.mjs scripts/setup-project-page.mjs scripts/tests/storyblok-project-page-migration.test.mjs
git commit -m "feat: add additive project page migration"
```

---

### Task 3: Fetch and validate canonical project pages

**Files:**
- Create: `next-app/lib/storyblok/project-delivery.ts`
- Create: `next-app/lib/storyblok/project-delivery.test.ts`
- Modify: `next-app/lib/storyblok/types.ts`

**Interfaces:**
- Produces: `isProjectSlug`, `detectProjectMediaType`, `mapProjectStory`, `fetchProjectContent`.
- Produces types: `ProjectMediaType`, `ProjectAsset`, `ProjectMetadata`, `ProjectBlock`, `ProjectContent`, `ProjectPageData`.
- Reuses: #58's region URL and configuration error.

- [x] **Step 1: Write failing media tests**

Assert `.PNG?x=1#hero` plus `image/png` is image, `.MOV` plus `video/quicktime` is video, extension-only `.webp` is image, and MIME-only `video/mp4` is video. Reject HTTP/JavaScript/invalid URLs, unsupported types, and disagreements such as `image/png` with `.mp4`.

- [x] **Step 2: Write failing mapper tests**

Assert valid enabled content maps; all optional metadata may be absent; tags and body preserve order; image/video blocks form a discriminated union; image alt is required; video alt is optional; empty thumbnail maps absent; a supplied thumbnail must be image; disabled/wrong components map `null`; enabled stories reject empty title, invalid rich text, unknown blocks, and header counts other than one.

- [x] **Step 3: Write failing fetch tests**

With injected fetch, verify AP host and `projects/product-design-tracer`; published/public and draft/preview token selection; draft `cv`; invalid slug without network; 404 to `null`; redacted HTTP/network errors; and named missing credentials.

- [x] **Step 4: Confirm RED**

Run `npm test -- next-app/lib/storyblok/project-delivery.test.ts`.

- [x] **Step 5: Add types**

Define:

```ts
export type ProjectHeaderBlock = { _uid: string; component: "project_header" };
export type ProjectTextBlock = {
  _uid: string; component: "text";
  content: { type: "doc"; content: unknown[] };
};
export type ProjectMediaBlock = {
  _uid: string; component: "media";
  asset: { url: string; type: "image" | "video" };
  alt?: string; caption?: string;
};
export type ProjectBlock = ProjectHeaderBlock | ProjectTextBlock | ProjectMediaBlock;
```

`ProjectMetadata` has optional client/year/discipline/thumbnail and ordered tags. `ProjectContent` has story IDs, slug, title, existing preview fields, metadata, and ordered body. `ProjectPageData` adds `isPreview`.

- [x] **Step 6: Implement validation and fetch**

Use image extensions `.avif`, `.gif`, `.jpeg`, `.jpg`, `.png`, `.svg`, `.webp` and video extensions `.m4v`, `.mov`, `.mp4`, `.webm`. Require HTTPS; derive extensions from `URL.pathname`; classify `image/*`/`video/*`; reject recognised disagreement or no classification.

Validate `_uid`, native rich-text document shape, `project_tag` labels, optional field types, exactly one header, and image-only alt. Fetch with `cache: "no-store"`, version-specific token, and draft `cv`.

- [x] **Step 7: Confirm GREEN and commit**

```sh
npm test -- next-app/lib/storyblok/project-delivery.test.ts
git add next-app/lib/storyblok/types.ts next-app/lib/storyblok/project-delivery.ts next-app/lib/storyblok/project-delivery.test.ts
git commit -m "feat: validate Storyblok project pages"
```

---

### Task 4: Reuse #58 at the project server boundary

**Files:**
- Create: `next-app/lib/storyblok/project-server.ts`
- Create: `next-app/lib/storyblok/project-server.test.ts`

**Interfaces:**
- Consumes: `resolveStoryblokVersion`, `fetchProjectContent`, Storyblok environment/search types.
- Produces: `loadProjectPage(options): Promise<ProjectPageData | null>`.

- [x] **Step 1: Write failing orchestration tests**

Reuse the independent SHA-1 signed-parameter fixture pattern from `server.test.ts`. Prove normal requests use published/public, signed local requests use draft/preview with `cv`, signed production requests remain published, and `null` passes through for invalid/missing/disabled stories. Prove missing configuration keeps #58's focused errors.

- [x] **Step 2: Confirm RED**

Run `npm test -- next-app/lib/storyblok/project-server.test.ts`.

- [x] **Step 3: Implement the server-only loader**

Start with `import "server-only";` and export:

```ts
export async function loadProjectPage({
  slug, searchParams, environment = process.env,
  fetchImpl = fetch, now = Date.now(),
}: {
  slug: string;
  searchParams: StoryblokSearchParams;
  environment?: StoryblokEnvironment;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<ProjectPageData | null>;
```

Use the existing signed-query resolver and select only the matching token. Do not initialise the React SDK or alter the homepage loader.

- [x] **Step 4: Confirm GREEN and commit**

```sh
npm test -- next-app/lib/storyblok/project-server.test.ts
git add next-app/lib/storyblok/project-server.ts next-app/lib/storyblok/project-server.test.ts
git commit -m "feat: load previewable project pages"
```

---

### Task 5: Render blocks through `/projects/[slug]`

**Files:**
- Create: `next-app/app/projects/[slug]/project-page.tsx`
- Create: `next-app/app/projects/[slug]/project-page.test.tsx`
- Create: `next-app/app/projects/[slug]/page.tsx`
- Create: `next-app/app/projects/[slug]/page.test.tsx`
- Modify: `next-app/app/globals.css`

**Interfaces:**
- Consumes: project data, `loadProjectPage`, existing Bridge, `StoryblokServerRichText`.
- Produces: `ProjectPageView`, typed block components, dynamic route.

- [x] **Step 1: Write failing real-render tests**

Render with `renderToStaticMarkup` and the actual SDK renderer. Do not mock rich text. Assert title; omission of empty optional metadata rows; supplied metadata/tags; rich-text paragraph; image alt; video controls without required alt; optional caption; exact DOM block order; published/draft marker; and absence of token sentinels.

- [x] **Step 2: Write failing route tests**

Mock only Next `notFound` and `loadProjectPage`. Assert awaited slug/search params are passed through, data renders, and `null` invokes `notFound()`.

- [x] **Step 3: Confirm RED**

Run:

```sh
npm test -- 'next-app/app/projects/[slug]/project-page.test.tsx' 'next-app/app/projects/[slug]/page.test.tsx'
```

- [x] **Step 4: Implement server rendering**

Import only `StoryblokServerRichText` from the SDK; do not call `storyblokInit`, `apiPlugin`, `useStoryblok`, or `StoryblokComponent`. Render blocks with an exhaustive switch. Use `<StoryblokServerRichText document={block.content} />`, semantic `<figure>`, `<img>`, and `<video controls playsInline preload="metadata">`.

- [x] **Step 5: Implement route and Bridge reuse**

Export `dynamic = "force-dynamic"`; await params/search params; load; call `notFound()` on `null`; render the existing `StoryblokPreviewBridge` only for preview.

- [x] **Step 6: Add neutral CSS**

Add focused project flow/header/meta/text/media rules, responsive padding, `max-width: 100%`, and `height: auto`. Do not reproduce legacy tabs or add Cloudinary logic.

- [x] **Step 7: Confirm GREEN and commit**

```sh
npm test -- 'next-app/app/projects/[slug]/project-page.test.tsx' 'next-app/app/projects/[slug]/page.test.tsx'
git add 'next-app/app/projects/[slug]' next-app/app/globals.css
git commit -m "feat: render Storyblok project page blocks"
```

---

### Task 6: Document and run regression/security gates

**Files:**
- Modify: `next-app/README.md`
- Modify: `docs/storyblok-setup.md`
- Modify: this plan and the approved design spec.

- [x] **Step 1: Document operations**

Document these commands:

```sh
npm run storyblok:project-page
npm run storyblok:project-page -- --apply
npm run dev
npm run storyblok:project-page -- --publish
```

Explain root management environment versus Next delivery environment, `/projects/product-design-tracer`, signed preview, disabled 404s, separate publish, rollback, and #82 ownership.

- [x] **Step 2: Run full checks**

```sh
npm test -- --reporter=verbose
node --test scripts/tests/*.test.mjs
node scripts/verify-storyblok.mjs
npm run build
git diff --check
```

- [x] **Step 3: Scan secrets and protected paths**

Verify no management token reference exists under `next-app`, no sentinel appears in emitted browser assets/HTML, and this command is empty:

```sh
git diff origin/main -- index.html style.css render-projects.js projects.json content/case-studies .github/workflows
```

- [x] **Step 4: Commit docs**

Mark Tasks 1–6 complete, then commit the READMEs, design amendments, and this plan with `docs: explain project page setup and verification`.

---

### Task 7: Apply and verify the live draft

**Files:** No tracked changes; keep before/after JSON and server logs in a `mktemp -d` directory.

- [x] **Step 1: Snapshot live state**

Capture the full `project` component plus every existing `projects/*` ID, slug, `updated_at`, and SHA-256 content hash. Confirm the tracer is absent. Never store tokens.

- [x] **Step 2: Run real dry-run**

Source the saved checkout's root `.env` and run `npm run storyblok:project-page`. Expect four creates, one additive schema update, one draft create, and no writes.

- [x] **Step 3: Apply draft migration**

Run `npm run storyblok:project-page -- --apply`. Expect only four component creates, one `project` component update, and one unpublished tracer create.

- [x] **Step 4: Compare live state**

Assert every pre-existing project hash and timestamp is unchanged; legacy schema fields are equivalent after ignoring management field IDs; only approved fields were added; tracer is unpublished, hidden from home, enabled, thumbnail-empty, and header/text/media ordered.

- [x] **Step 5: Start Next with delivery credentials only**

Load public/preview/region values, remove management token and space ID from the Next process environment, and start `npm run dev` with logs in the temp directory.

- [x] **Step 6: Verify draft and 404s**

Using a current valid signed URL, prove the tracer returns 200/draft with title, rich text, asset URL, alt, and Bridge. Prove unsigned tracer returns 404 before publish, unknown returns 404, Aesop returns 404, and responses/logs contain no tokens.

- [ ] **Step 7: Verify saved-draft reload**

In the Visual Editor, save a harmless tracer-text change, observe the Bridge reload, then restore the approved text. Do not open or save another project.

Not run automatically: the signed draft route and Bridge were verified directly,
but no editor content mutation was made solely for this smoke check.

---

### Task 8: Publish, review, and update PR #88

**Files:** Only review fixes, if any.

- [x] **Step 1: Publish separately**

Run `npm run storyblok:project-page -- --publish`. Verify only the exact tracer ID reaches the publish endpoint.

- [x] **Step 2: Verify live states**

Prove unsigned tracer is 200/published; signed is 200/draft; content matches; unknown and existing disabled projects are 404; static homepage output remains equivalent.

- [x] **Step 3: Run final verification fresh**

```sh
npm test -- --reporter=verbose
node --test scripts/tests/*.test.mjs
node scripts/verify-storyblok.mjs
npm run build
git diff --check
git status --short --branch
```

- [x] **Step 4: Review against #72 and the design**

Check every criterion plus credential boundaries, no existing-story writes, no Aesop coupling, no #82 architecture, and no protected static changes. Any code fix starts with a failing test.

- [x] **Step 5: Push without force**

Commit review fixes if present, then run:

```sh
git push origin HEAD:refs/heads/codex/72-storyblok-project-page
```

- [x] **Step 6: Formally link the ticket**

Replace `Relates to #72` in PR #88 with `Closes #72`. Keep the PR draft; do not merge or mark ready without a separate request.

- [x] **Step 7: Report evidence**

Report PR URL, final commit, test/build counts, published and preview checks, preservation hashes, external CI state, and ignored/generated artifacts.
