# Homepage snap toggle implementation plan

**Goal:** Allow Storyblok Home editors to switch the static homepage between free and project snapping scroll.
**Architecture:** Map `snap_scrolling === true` to `snapScrolling`, render/hydrate `data-home-snap`, and use native CSS snapping while suspending Lenis. Default is false.
**Constraints:** Preserve unrelated changes. No publication or Next.js edits. Commit and PR creation authorized on 25 October 2026. Review with current Storyblok drafts on https://localhost:8001/ using the internal browser.

- [x] Add failing coverage to `scripts/tests/home-scroll.test.mjs` for CSS mode selection, reduced motion and Lenis switching; add mapper/hydration/prerender coverage.
- [x] Add the boolean to `scripts/storyblok-schema.mjs`, the content mapper, seed, hydration and prerender. Wire the root setting to CSS and the Lenis lifecycle. Bump changed asset URLs.
- [x] Add a targeted schema migration with backup, repeat-run safety and concurrent-change checks; verify with fake API tests before applying to Storyblok.
- [x] Run relevant static tests, inspect diff, verify live schema and draft parity, then exercise both modes in the internal browser. Keep the initial implementation uncommitted until PR creation is authorized.

## Verification and CMS setup

The configured management token returned HTTP 401. Added the field through the authenticated Storyblok internal-browser session instead; verified it appears on the Home entry and is off. No story was saved or published. The CLI migration remains available when management access is restored.

Browser verification: native snap mode settled successive projects at the viewport centre; Lenis was disabled. Reduced motion disabled snapping. Reload restored the saved draft default (off) and Lenis resumed. The preview matched all five current mapped Storyblok draft files. All 121 static tests pass. On 25 October, Rowan authorized a PR. The branch is based on current main and preserves the merged 50px project gap. Unrelated local Next.js CSS and row-geometry test edits remain in the original checkout. Fresh checks: 121 static tests and 151 Vitest tests pass; code review found no actionable issues.
