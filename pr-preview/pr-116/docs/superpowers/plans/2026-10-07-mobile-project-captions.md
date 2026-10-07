# Mobile Project Captions Implementation Plan

**Goal:** Show mobile categories at the portrait right edge beside rich-text project titles.

**Architecture:** Add a caption wrapper that uses display: contents on desktop and a two-column grid on mobile. Convert Storyblok display_name through the existing category plain-text helpers so strings and rich-text documents share the same rendering path.

**Tech stack:** Static JavaScript/CSS, Next.js, Storyblok, Node tests, Vitest.

## Constraints

Mobile through 857px. Retain portrait dimensions and the stable slideshow container with a 20px caption gap. Preserve desktop metadata. No content publication or deployment. Commit and create a PR after final verification, as explicitly requested.

## Tasks

- [x] Add regression tests for multiline display-name mapping and rendered line breaks; run them before implementation.
- [x] Update scripts/storyblok-content.mjs, next-app/lib/storyblok/delivery.ts and project-delivery.ts to convert display_name using category helpers. Set display_name to richtext in scripts/storyblok-schema.mjs and emit documents from scripts/storyblok-seed.mjs.
- [x] Wrap title/category in render-projects.js and next-app/app/page.tsx. Use a centred portrait-width grid with minmax(0, 1fr) columns, a 16px gap and start alignment on mobile in both stylesheets. Allow wrapping and right-align category. Keep desktop wrapper display: contents. Refresh index.html stylesheet revision.
- [x] Verify mobile geometry, long captions, orientation transitions and desktop; run Node tests, Vitest and production build.
- [x] Inspect current CMS field and existing values. Apply only the approved display_name field conversion; preserve existing content and never publish.

## Verification

85 Node tests and 100 Vitest tests pass; the Next.js production build and git diff --check pass. Browser measurements confirm both homepages at 320, 390, 600 and 857px: categories visible, first lines aligned, title/category at the portrait edges, no horizontal overflow. Desktop at 858 and 1440px retains display: contents and side categories. The first Next.js caption retained identical coordinates across slide changes.

Storyblok management API returned 401; the signed-in Chrome editor was used to change only display_name to Richtext and label it Project title. The existing Print Campaign title is visible in the editor. Delivery API comparison confirms all eight project content objects are unchanged. Existing strings remain supported and are converted by the editor when edited. No stories published or deployment.

## Issue #112 link follow-up

- [x] Add parser, mapping, static DOM and React rendering regression coverage for links in both captions, resolved internal UUIDs, escaped text, line breaks and unsafe URL fallback.
- [x] Implement shared scripts/storyblok-label-links.mjs with a typed declaration, optional displayNameParts/categoryParts fields and resolve_links=url delivery requests. Render safe anchors in the static renderer and next-app/app/project-label.tsx with underline and focus styles.
- [x] Check linked captions in isolated local fixtures without modifying CMS content: web links preserve target/rel, mobile captions stay aligned and category anchor navigation works in both homepages.
- [x] Rebase onto current origin/main, run final verification and commit the implementation. PR delivery closes #112.

## Final PR verification

Rebased onto origin/main b5373ef, including PR #109 full-width slideshow controls. All 94 Node tests and 102 Vitest tests pass; production build and git diff --check pass. Caption links were browser-checked at 390px using isolated static and Next.js fixtures; anchor navigation works and title/category remain aligned without overflow. No CMS fixture values were saved or published.
