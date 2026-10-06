# Issue #110 implementation plan

**Goal:** Keep titles below media at the portrait left-edge position and show independent desktop project numbers.

**Architecture:** Both homepages use their existing responsive portrait-width custom property for a centred caption track. The media row remains centred and the caption participates in document flow to reserve space for wrapping. Number fields pass through existing CMS delivery paths; rendering supplies a visible-feed-position fallback.

**Tech stack:** Static JavaScript/CSS, Next.js/React, Storyblok, Vitest, Node tests.

## Constraints

- Desktop begins above 700px; titles use a 20px gap below the stable slideshow container and wrap within the portrait width.
- Keep portrait sizes/crops, controls, categories, and scrolling; contain landscape media within the reserved slideshow track to avoid title overlap.
- No remote CMS writes or content publication. Commit and open a PR after verification, as requested.

## Task 1: Number data and rendering

- [x] Add failing tests for explicit `project_number` mapping to `projectNumber`, missing values, and server-rendered numbers with fallback `01`, `02`.
- [x] Run Node mapper tests and Vitest homepage tests to confirm the failures.
- [x] Add optional text fields to `scripts/storyblok-schema.mjs`, `scripts/storyblok-seed.mjs`, `admin/config.yml`, `scripts/storyblok-content.mjs`, `next-app/lib/storyblok/types.ts`, and `next-app/lib/storyblok/delivery.ts`.
- [x] Update `render-projects.js` and `next-app/app/page.tsx` to render a number, media, title, category in that order. Render `project.projectNumber?.trim() || String(index + 1).padStart(2, "0")`.
- [x] Run focused tests.

## Task 2: Caption layout

- [x] Update `style.css` and `next-app/app/globals.css` with an explicit media row and auto-sized title row. Use each homepage's portrait-width property for the caption width and centre it across the entire project row. Preserve the existing media track height on desktop.
- [x] Replace desktop side-title positioning with side-number positioning, aligned to the media row centre. Hide numbers on mobile and keep categories' current responsive behaviour.
- [x] Update existing geometry tests for the caption's additional flow row.
- [x] Check portrait/landscape transitions, landscape-only projects, resized windows, videos, and long titles in a real browser. Compare title and portrait left edges and confirm title x-position is unchanged across slide changes.

## Task 3: Review and verification

- [x] Run `node --test scripts/tests/*.test.mjs`, `npm test`, `npm run build`, and `git diff --check`.
- [x] Review the diff for unrelated changes, update the approved spec's status, and provide local preview links with any verification limitations.

## Verification results

- Based on latest `origin/main` commit `587e79f`; changes are prepared for a PR on `codex/issue-110-project-titles`.
- 82 Node tests and 99 Vitest tests pass; production build passes after preserving stale generated route types outside the repository.
- Browser geometry verified at 1440×1000, 1024×768, 700×600, 600×700, and 390×844. Caption anchor matches the responsive portrait track and the stable slideshow track has a 20px caption gap in both implementations.
- Static and Next.js landscape/image ↔ portrait/video transitions retain the same title x- and y-coordinates within the project. Long titles wrap without horizontal overflow or overlap with the next project.
- Verification uses an isolated headless browser. Static Storyblok draft preview remains at https://localhost:8001/.
- Existing CMS display names currently contain `001`–`006`; no CMS values or schema were changed remotely. The new field must be applied and the display names restored before the preview shows names below images.

## Final browser review changes

The user requested an additional 10px of space and a stable vertical title position. Both homepages now use a 20px gap below the slideshow container. Removed the per-image bottom-edge offset. Next.js mobile uses a stable portrait-height container; desktop media is constrained to its reserved track in both implementations. Mixed-orientation slide changes keep both title coordinates unchanged at 1208×862, 609×862, 390×844, and 700×400. Short desktop (1440×600) checks confirm media does not overlap the caption.
