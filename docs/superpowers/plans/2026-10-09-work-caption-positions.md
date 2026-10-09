# Work caption positions implementation plan

Execute inline using executing-plans; leave all changes uncommitted for local review.

**Goal:** Four shared position controls on the existing Next.js Work block.

**Architecture:** Resolve typed positions from Work. A caption renderer keeps fields in fixed order and groups them into four desktop slots or two mobile slots. The slideshow owns its live counter state. CMS migration is additive and draft-only.

**Constraints:** Preserve static production, legacy rendering, individual project pages, slideshow interactions, rich-text links and Home visibility settings. Use the in-app browser only. CMS apply follows review of a concrete plan.

## 1. Schema and delivery

- [x] Add failing tests in `next-app/lib/storyblok/homepage-blocks.test.ts` for independent defaults, saved positions and invalid values.
- [x] Add typed `WorkCaptionPositions`, shared defaults and option definitions; extend `project_feed` and map positions with `mapWorkCaptionPositions(value)`.
- [x] Pass positions through both `HomepageBlocks` Work paths only when Home has a composed body. Retain legacy fallback behavior.
- [x] Run `npm test -- next-app/lib/storyblok/homepage-blocks.test.ts`.

## 2. Caption slots

- [x] Add render tests proving shared placement, default layout, field order, hidden/empty values and rich-text preservation, plus mobile Left/Right mapping.
- [x] Create `homepage-work-captions.tsx` and its position helper. Pass positions, formatted project number and visibility to `HomepageSlideshow`; render slot captions from the existing slide index.
- [x] Add scoped CSS for four normal-flow slots, wrapping, 10px stacking gaps and mobile merged slots. Keep image sizing and legacy CSS isolated.
- [x] Extend existing interaction tests to verify live counters placed in custom slots still respond to clicks, keys and swipes.
- [x] Run focused Vitest rendering and interaction tests.

## 3. Additive CMS migration

- [x] Add failing Node tests for plan zero writes, preset transfer, explicit settings preservation, backups, conflicts and idempotence.
- [x] Implement `runWorkCaptionMigration({api, mode, backup})` with a dedicated plan-first CLI. Merge only approved Work fields and save explicit equivalent preset positions to missing Work fields on Home draft.
- [x] Update composition migration compatibility to permit optional additive position fields and preserve changed composition on rerun.
- [x] Run Node migration tests. Management API plan returned HTTP 401; Rowan directed browser application. Added all four fields through the signed-in internal browser and saved only the Home draft.

## 4. Verification and review

- [x] Run `node --test scripts/tests/*.test.mjs`, `npm test`, `npx tsc --noEmit -p next-app/tsconfig.json`, `npm run build`, and `git diff --check`.
- [x] Start the Next.js HTTPS development server and verify draft delivery. Check desktop/mobile, boundary widths, long captions, empty fields, all fields in one slot and navigation using the in-app browser.
- [x] Document results, unresolved limits and CMS plan. Leave implementation uncommitted.

## Verification results (2026-10-09)

- 163 Vitest tests and 126 Node tests passed; TypeScript, production build and diff checks passed.
- In-app browser verified saved Next.js draft delivery (six projects), default/shared/mixed positions, 1280px and 858/857px boundaries, 390px mobile, long text, empty fields, exact independent 10px gaps, grey formatted counters and slide navigation.
- Desktop/mobile screenshots are saved under the task visualization directory. Temporary review route and generated root TypeScript cache moved to Trash.
- Independent review identified coupled mobile row heights; fixed with independent mobile flex columns and verified. Follow-up review found no actionable issues.
- Browser CMS application completed: four Work Single-Option fields with all four choices and approved defaults. Home stores title bottom-right, category bottom-left, caption bottom-right and number left, preserving its existing below-flipped preset. Delivery API comparison confirms every other Home content field is unchanged; published_at is unchanged.
- Before/after Home snapshots and visible original Work schema details are in ignored `.storyblok-backups/work-captions-*` files. Storyblok retains original component version 228674925058429 for restoration.
- Verified current saved draft in the internal Next.js browser: all six projects use category bottom-left and title/counter bottom-right; hidden numbers remain hidden and navigation updates the counter. Saved CMS proof is `work-storyblok-saved.png` in the task visualization directory.
- Storyblok's built-in preview link uses a signature that differs from the configured local preview token and falls back to published content. A fresh link signed with the configured token verifies `data-storyblok-content=draft` and all six positioned projects. The verified draft tab remains open. Management token still returns 401; no credential changes or publication.
- Changes remain uncommitted on codex/work-caption-positions.

## Hidden option follow-up (2026-10-09)

- Rowan requested Hidden for all four controls after review. Added `hidden` to shared schema options and types; the mapper preserves it and the renderer omits the field in both responsive variants. Hidden titles retain a section label without a dangling title reference.
- Added Hidden to all four saved Storyblok dropdown schemas through the internal browser. Existing defaults and Home draft values are preserved.
- Verified a temporary saved Hidden title selection removes title fields from all six draft projects, then restored the exact Home content. Delivery comparison confirms restoration and unchanged publication time.
- 169 Vitest and 127 Node tests pass; TypeScript, production build and diff checks pass. Screenshot proof is `work-hidden-option.png` in the task visualization directory. Changes remain uncommitted and unpublished.
