# Free Scroll Implementation Plan

**Goal:** Native free scrolling with a light desktop wheel glide.

**Architecture:** Use Lenis wheel interpolation without a project selector. Disable homepage CSS snap independently of whether Lenis is active. Route Information/Work animation through the desktop controller.

**Tech Stack:** Static HTML/CSS/JavaScript, vendored Lenis 1.3.26, node:test and happy-dom.

## Constraints

Preserve geometry, Storyblok content, Next.js and unrelated local changes. Commit and push to codex/free-scroll after verification, as authorized on 2 October 2026. Production publication is outside this change. Mobile and reduced motion remain native.

## Steps

- [x] Add behavioural tests in scripts/tests/home-scroll.test.mjs for disabled root snapping and freely chosen wheel targets, rapid repeats, reversal, navigation and native fallbacks. Run node --test scripts/tests/home-scroll.test.mjs and observe failure.
- [x] Reuse PR 103 vendor assets unchanged. Add home-scroll.js with smoothWheel true, syncTouch false, lerp 0.1, wheelMultiplier 0.85; no gesture limiter or destination selection. Add module to index.html; delegate info-scroll.js navigation; disable CSS snapping and CSS smooth scrolling on the homepage root.
- [x] Run node --test scripts/tests/*.test.mjs, git diff --check and real browser checks at desktop and mobile sizes. Open the local preview for user review; then commit and push the approved change.

## Validation

74 static-site tests passed; git diff --check passed. Chromium desktop input settled at arbitrary offsets (400 to 536 after a 160px wheel input), accepted repeated input (536 to 672), and crossed multiple rows (672 to 2202). Information/Work navigation reached 0 and 394. At mobile width the smoothing controller was disabled; reduced motion disabled it and a native 160px wheel input advanced exactly 160px. Browser console had no errors or warnings. Physical trackpad feel remains for local user review.

Preview: http://127.0.0.1:8002/#work
