# Mobile loading and boundary implementation plan

Approved by Rowan on 18 November 2026 in this chat. Implemented inline and initially left uncommitted for local review. Rowan subsequently authorized committing the reviewed changes and opening a PR on the same date.

**Goal:** Show the static homepage promptly, reserve slideshow geometry, and remove mobile scroll-boundary corrections while preserving INFO navigation.

**Architecture:** A small delivery/layout helper uses cached source dimensions and dimensions encoded in Storyblok image URLs. Home slideshows reserve their complete frame synchronously and load only their current media near the viewport, with video posters and readable fallback states. On mobile, closed Information is removed from flow so Work starts at native scroll zero; explicit navigation reveals it with position compensation.

**Stack:** Existing static HTML/CSS/JavaScript, Storyblok JSON, Node test runner, Codex in-app browser.

## Constraints and budgets

- Static site only; no `next-app/`, CMS/schema/settings, deployment, DNS or hosting changes.
- Preserve desktop composition, manual project scrolling, captions, slideshow controls, history, reduced motion, information-first and hidden-navigation modes.
- Test 390 × 844, cache disabled, 200,000 download bytes/sec, 150 ms latency, same saved six-project draft snapshot.
- Navigation/captions visible ≤2.5 seconds; first image/poster usable ≤5 seconds. Record video readiness separately.
- First frame/caption movement ≤1 CSS px on media readiness; load-induced CLS ≤0.02.
- Unknown/unavailable media keeps reserved geometry and displays a readable fallback. Offscreen assets cannot gate first-project use.
- No application scroll corrections during repeated upward input at mobile Work top. After input/native overscroll settles, movement ≤1 px over 500 ms.
- iPhone/Instagram and approved deployed verification remain release requirements, never inferred from viewport tests.

## 1. Stable media delivery

Files: `media-layout.js`, `assets/media-dimensions.js`, `scripts/update-media-dimensions.mjs`, `render-projects.js`, `slideshow.js`, `style.css`, `index.html`, focused tests in `scripts/tests/mobile-loading.test.mjs`.

- [x] Add failing tests: known portrait/video geometry is reserved before media events; pending offscreen dimensions launch no probes; no offscreen video `src`; first video has a JPEG poster; current-media failure preserves controls and exposes fallback.
- [x] Run `node --test scripts/tests/mobile-loading.test.mjs` and confirm expected failures.
- [x] Implement `window.kspfMediaLayout.aspect(src)`, `frame(slides)`, `image(src, width)`, `poster(src)` with cached dimensions keyed by full source URL. Derive Storyblok image dimensions from its URL. Unknowns retain a fixed portrait-sized fallback frame.
- [x] Populate the dimension cache from the saved draft snapshot with a repeatable metadata-only updater. Preserve original media URLs in Storyblok. No full-media browser probes for reserved home frames.
- [x] In `render-projects.js`, apply frame CSS before DOM insertion, add loading/error text, and keep sources in data attributes until near-viewport initialization. Give the first image/poster eager/high priority delivery.
- [x] In `slideshow.js`, retain legacy case-study behavior; for reserved home frames classify media from cached metadata or its own load event. Do not mutate frame sizing when media arrives. Defer offscreen initialization and neighboring-image preloads. Keep poster visible until video has data; surface failures/autoplay rejection without blocking next/previous controls.
- [x] Remove whole-body readiness hiding while retaining content-ready positioning events. Bump changed homepage asset cache keys.
- [x] Run focused tests and existing slideshow/render/geometry tests; inspect and update assertions only where the approved behavior deliberately changed.

## 2. Native mobile Work boundary

Files: `info-scroll.js`, `index.html`, `style.css`, `scripts/tests/info-scroll.test.mjs`.

- [x] Add failing tests using geometry that reflects collapsed Information: Work top is zero while closed, upward events do not call scrollTo, INFO reveals with compensation, return to Work collapses without changing visible position, desktop retains its boundary, information-first/hidden navigation stay accessible.
- [x] Implement a mobile media-query state and `is-information-closed` root class. Hide only restricted closed Information on mobile. Before revealing, save Work-relative position and compensate to the new Work offset; after reaching Work, collapse and preserve the Work-relative position. Do not clamp native overscroll at a zero boundary.
- [x] Re-evaluate on breakpoint changes, initial JSON readiness and back/forward navigation. Keep the existing desktop Lenis integration.
- [x] Run `node --test scripts/tests/info-scroll.test.mjs scripts/tests/home-scroll.test.mjs scripts/tests/home-initial-content.test.mjs`.

## 3. Verification and handoff

- [x] Run `node --test scripts/tests/*.test.mjs`; verify no Next.js edits and no unrelated changes.
- [x] Verify preview content against a fresh draft delivery fetch; keep HTTPS 8001 running.
- [x] Repeat constrained/unthrottled cold load instrumentation in the in-app browser, measure first visible content/poster/video and frame movement/CLS separately.
- [x] Exercise image-first/video-first, failed media, slideshow reversal, INFO/Work/back, repeated upward input, desktop and reduced motion. Remove temporary browser overrides and instrumentation after verification.
- [x] Record actual results and remaining device/release gaps in the existing Notion task. Hand back the running preview and uncommitted diff. Do not close the GitHub issue or publish.

## Verification record

Local verification completed on 18 November 2026 before committing for PR review; no production deployment. Independent review findings about poster/error ordering and autoplay retry were fixed with regression coverage.

- Full static Node suite: 146 passed, including the PR follow-ups below. Existing module-type warning from the Lenis test remains unchanged.
- 390 × 844 in-app Chromium, cache disabled, 1.6 Mbps download / 150 ms latency, same saved-draft project snapshot:
  - Run 1: captions/navigation 1.930 s; poster 2.780 s; video readyState ≥2 at 5.329 s.
  - Run 2: captions/navigation 1.996 s; poster 2.892 s; video readyState ≥2 at 5.342 s.
  - Both: frame 450 px, caption top 570 px throughout media loading; no Layout Instability entries.
- Warm-cache comparison under the same network throttle: captions/poster sampled ready at 1.748 s; video data at 1.898 s. Actual first readiness can be up to 50 ms earlier than the sampling time.
- Eight upward wheel events at Work top: zero application scrollTo calls, y=0 throughout the subsequent recorded settling period (>500 ms).
- Browser checks: image-first Arcteryx loaded, failed first video/poster shows a readable fallback in the unchanged 450 px frame, Next recovers to the second slide, next/previous counters wrap, INFO/Work and Back return correctly, direct #information opens Information, breakpoint compensation and reduced-motion navigation verified.
- Desktop 1280 × 720 first media rect matches baseline exactly: x=372, y=160, width=536, height=670.
- Fresh preview projects/home/site JSON each matched a fresh Storyblok draft fetch. HTTPS preview remains at https://localhost:8001/.
- Remaining release checks: real iPhone, Instagram in-app and external-browser handoff, the original extended white interval, and published production behavior after separately approved release. No real-device elastic overscroll claim follows from Chromium wheel tests. Information-first/hidden-navigation modes have automated coverage; actual CMS settings were not changed for testing.

### PR follow-up

PR #145 review identified that autoplay retry was below the slideshow hit targets (30 versus 1000). A regression test reproduced the stacking conflict. Raised retry to 1001 and bumped the CSS cache key. Browser hit-testing confirmed `hero__play` receives the click; a real locator click called playback once, kept counter `001 / 002`, resumed video and hid retry. Temporary autoplay simulation was discarded by reload.

The 18.345-second recording named in Rowan's PR comment was found locally in Dropbox Screenshots and inspected. Rowan clarified that the whole clip shows unwanted flashes between first-project slides and unwanted loading text on later projects. This is separate from the retry-button defect.

Home slides now preserve the outgoing frame until the incoming image loads or video starts playing, then crossfade opacity without blur. The initial poster is retained only for the initial load, not swapped between slides. Normal loading text is removed; unavailable-media and autoplay retry remain visible. Rapid requests reuse only the nonvisible slot. A late outgoing load cannot clear an incoming slide's failure. These cases have regression coverage.

Browser verification at 390 × 844 with 1.6 Mbps / 150 ms: immediately after Next, old video remained visible with readyState 4 while incoming was at readyState 0. Across 601 sampled observations, source switched to the second video, caption stayed at 570 px, and no poster, loading status or blur appeared. Two later readyState 1 observations reflect constrained playback buffering; they are not evidence that buffering is eliminated. First-media loading budgets and real-device release gaps remain separate.
