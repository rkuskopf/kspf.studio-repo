# Composable Homepage Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task inline. Steps use checkbox syntax for tracking. Preserve unrelated work and leave implementation uncommitted for local review.

**Goal:** Implement issue #59: render the existing Next homepage from ordered Information, Navigation and Work blocks in Storyblok.

**Architecture:** Add a validated body to the existing Home schema. Information and Navigation reference the canonical Site story; Work uses the automatic projects/ feed. Keep legacy fields and synthesize the existing order only for stories with no body property.

**Tech Stack:** Existing Next.js App Router, TypeScript, React, Storyblok Delivery/Management APIs, Vitest and Node tests. No new dependencies.

## Global Constraints

- Preserve the live static homepage; this feature targets next-app only.
- Preserve current caption presets, slideshow behavior, project ordering and server-only credentials.
- Exactly one Information, Navigation and Work block, in any saved order; unique nonblank UIDs.
- Automatic Work feed: existing Show on home eligibility and current order.
- No story publication, unrelated content edits or commits.
- Internal browser only. Identify the Next dev server distinctly from static localhost:8001.
- CMS apply is a separate checkpoint after reviewing the concrete migration plan.

## Files and interfaces

- `scripts/storyblok-homepage-schema.mjs`: additive component definitions and Home body field, consumed by main schema and migration.
- `next-app/lib/storyblok/homepage-blocks.ts`: validates raw body and builds legacy body; exports `mapHomeBlocks(value: unknown): HomeBlock[]` and `legacyHomeBlocks(siteUuid: string): HomeBlock[]`.
- `next-app/lib/storyblok/types.ts`: discriminated `HomeBlock` union; optional `HomeContent.body` for legacy compatibility.
- `next-app/lib/storyblok/delivery.ts`: include validated body when present; fetch Site by optional UUID using `find_by=uuid`.
- `next-app/lib/storyblok/server.ts`: resolve distinct Site references with the existing delivery options; expose `sites: Record<string, SiteContent>` alongside existing site/projects values.
- `next-app/app/homepage-blocks.tsx`: focused Information, Navigation and Work components, and ordered renderer reusing HomepageSlideshow.
- `next-app/app/page.tsx`, `globals.css`: connect renderer; retain normal baseline geometry and hidden-navigation behavior.
- `scripts/storyblok-homepage-migration.mjs`: plan/apply, backups and conflict detection.
- `scripts/setup-homepage.mjs`: CLI defaults to plan; explicit apply only, no publish flag.
- `scripts/storyblok-project-page-migration.mjs`: add draft-only updateStory API method to the existing authenticated client.
- Tests beside each delivery/rendering module and under `scripts/tests/` for schema/migration.
- `next-app/README.md`: editor model, CLI/rollback and static transition limitations.

### Task 1: Typed body and server resolution

- [x] Add tests for all six permutations, absent legacy body, explicit empty/malformed body, unknown components, duplicate UIDs and duplicate core blocks.
- [x] Define Information/Navigation `{_uid, component, site: string}` and Work `{_uid, component: 'project_feed', collection: 'projects/'}` types.
- [x] Implement strict validation, preserving saved array order. Reject missing/blank references and unsupported collection values. Legacy UIDs are deterministic.
- [x] Extend Home delivery mapper only when `Object.hasOwn(content, 'body')`; preserve all caption mapping.
- [x] Resolve Home first; use shared version/token/cache settings to load projects and distinct Site references. Validate returned UUIDs and Site component types. Keep default Site fetch for legacy content only.
- [x] Test distinct references, reuse of shared reference, missing/wrong stories and signed draft/published selection without exposing credentials.
- [x] Run `npm test -- next-app/lib/storyblok/homepage-blocks.test.ts next-app/lib/storyblok/server.test.ts next-app/lib/storyblok/delivery.test.ts`.

Core validation pattern:
```ts
if (!Array.isArray(value) || value.length !== 3) throw new Error('Storyblok home body must contain Information, Navigation and Work.');
const ids = new Set<string>();
const components = new Set<string>();
// Validate each entry before adding it; never sort the body.
```

### Task 2: Ordered rendering with baseline geometry

- [x] Move Information markup unchanged into `HomepageInformation({site})`.
- [x] Move Navigation markup into `HomepageNavigation({content,site})`; render nothing when navigation is hidden.
- [x] Move project sections into `HomepageWork({projects})`, retaining three-digit project numbers, slideshow caption logic and first-project priority.
- [x] Implement a discriminated switch over body, using stable UIDs as keys and site reference lookups.
- [x] Preserve the baseline navigation overlay by grouping an adjacent Navigation→Work pair in one stage wrapper. For any other order render Navigation in normal flow with explicit spacing; keep actual body DOM order. Put Work anchor on the pair wrapper when paired, otherwise on Work itself, exactly once.
- [x] Add component tests for every permutation, unique Information/Work anchors, focus targets, hidden-navigation zero wrapper gap, rich-text links, counters and caption attributes.
- [x] Run `npm test -- next-app/app/page.test.tsx next-app/app/homepage-slideshow.test.tsx`.

Renderer skeleton:
```tsx
switch (block.component) {
  case 'information': return <HomepageInformation site={sites[block.site]} />;
  case 'navigation': return <HomepageNavigation content={content} site={sites[block.site]} />;
  case 'project_feed': return <HomepageWork projects={projects} />;
}
```

### Task 3: Additive schema and safe draft migration

- [x] Add nestable Information/Navigation components with single-story Site references and Work with a projects/ collection option. Add restricted body whitelist without touching legacy fields.
- [x] Test whitelist, required reference types, nestability and preservation of every existing Home field.
- [x] Create migration that reads Home, Site and schema; validates canonical stories, reports additions and body draft update, and performs zero writes in default plan mode.
- [x] Construct baseline body with deterministic UUIDs derived from Home UUID and component name; preserve all unrelated values and translations via spread of current content.
- [x] Compare existing component settings/fields after stripping server-assigned field IDs; retain extra fields; reject conflicting definitions.
- [x] Refuse replacement of an existing different body. Equivalent bodies, including editor-owned UIDs, require no write.
- [x] Before any mutation save exact story/schema snapshots through an injected backup function. Re-read all planned inputs and reject changes before writing. Add draft-only updateStory with `publish:false`.
- [x] Add CLI `node --env-file=.env scripts/setup-homepage.mjs`; `--apply` enables writes; write backups to ignored `.storyblok-backups/` with exclusive file creation.
- [x] Test zero-write plan, backups-before-write, fresh read conflict, idempotence, unrelated field preservation, translated fields and no publishing/project writes.
- [x] Run `node --test scripts/tests/storyblok-homepage*.test.mjs`.

Draft content construction:
```js
const content = { ...home.content, body: baselineBody };
await api.updateStory(home.id, { content }); // API sends publish:false
```

### Task 4: Integration and local review

- [x] Document CLI, backup restore as draft, shared references, adding new visible projects and static compatibility limitation.
- [x] Run `node --test scripts/tests/*.test.mjs`, `npm test`, `npm run build`, and `git diff --check`.
- [x] Start the isolated Next HTTPS dev server with server-only local tokens; use the internal browser for desktop/tablet/mobile and 857/858/1279/1280 boundaries. Check captions, overflow, keyboard controls, reduced motion and initial page load.
- [x] Run the migration plan against the configured space if management access is available. Report authentication limitations accurately; never claim CMS changes from mocked tests.
- [x] Apply draft migration through the signed-in internal browser and verify saved-draft reordering in the Next Visual Editor.

## Review

The implementation covers ordered core blocks, canonical references, legacy fallback, draft/published boundaries, typed rendering, additive migration, static compatibility and tests. #120 caption positioning and unfinished typography remain outside this feature. No commit step is included because Rowan prefers local review before committing.


## Execution evidence — 2026-10-09

Application/schema/migration code implemented in the managed composable-homepage workspace based on origin/main 3e85b01. Unrelated typography work in 079e is unchanged. Vitest: 135 passing; Node suite: 117 passing. Production build passed. Internal browser: all six orders; 390/768/857/858/1279/1280 widths without horizontal overflow; slideshow click and keyboard; reduced motion. Temporary local composition-review route removed after verification. Next HTTPS dev server runs on https://localhost:3001/ with published content.

The live read-only Management API plan returned HTTP 401. No CMS writes occurred. Concrete live migration actions and saved draft reorder verification remain blocked by management authentication. Mocked migration tests cover intended three component additions, additive Home body field and baseline Home draft composition. No commit, PR or publication was made.


## Browser migration verification — 2026-10-09

Rowan authorized using the signed-in browser to complete the CMS setup. Added Information, Navigation and Work schemas and Home Page blocks, preserving existing fields. Saved Home draft with Information → Navigation → Work, shared Site UUID references and automatic projects/ collection. Exact before/after Home content saved in ignored `.storyblok-backups/`; pre-migration Home schema revision 228252558839119 remains recoverable in Block Versions.

Home Real path is now `/`. Added `Next.js composition` preview URL https://localhost:3001/ while preserving static default8001 and existing Next3000. Updated only this worktree's ignored Next delivery environment to Storyblok's existing original Preview token after verifying the editor signature matches; no tokens created/rotated or management credential read/changed.

The Visual Editor iframe confirmed data-storyblok-content=draft. Saved test order Work → Information → Navigation and verified actual DOM order Work before Information; restored and saved baseline, then verified Information before Work. Legacy Home values match the backup, unique editor-generated UIDs confirmed, published Home still has no body. Navigation visibility stays off as configured. Site typography changed concurrently outside this task and was preserved. Nothing published or committed; management API remains unauthenticated, but browser migration is complete.

## PR preparation

Rebased onto origin/main 710ec73 after the global typography PR merged. Preserved shared typography tokens, navigation weight overrides and contact-email alignment. Final validation: 151 Vitest tests, 117 Node tests, production build and diff checks passed. Rowan authorized committing and opening a PR.
