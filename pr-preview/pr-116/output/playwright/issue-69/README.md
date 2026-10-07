# Issue #69 homepage parity evidence

Tested on 16 September 2026 immediately before the evidence commit.

## Automated verification

- `npm test`: PASS — 13 files, 95 tests.
- `npm run build`: PASS — `/` and `/projects/[slug]` compiled successfully.
- Production response: PASS — `http://127.0.0.1:3000/` returned 200 with the Storyblok delivery environment loaded from the repository-root `.env`.

## Visual comparison

| Viewport | Static baseline | Next.js implementation |
| --- | --- | --- |
| 1440x1000 | [desktop-static.png](desktop-static.png) | [desktop-next.png](desktop-next.png) |
| 1024x768 | [tablet-static.png](tablet-static.png) | [tablet-next.png](tablet-next.png) |
| 390x844 | [mobile-static.png](mobile-static.png) | [mobile-next.png](mobile-next.png) |

The static captures use `https://kspf.au/`; the Next.js captures use the local production build. Animated video frames can differ between captures, while project identity, media containment, metadata placement, and feed spacing remain directly comparable.

## Content and interaction checks

- Project order: ARCTERYX → Aesop → Jak Architecture → alt. cosmetics → Albus Lumen → AP—REPS.
- Media delivery: PASS — every initial image/video loaded after scrolling the feed; no browser console errors remained.
- Pointer controls: PASS — each control changes only its own slideshow.
- Keyboard controls and visible focus: PASS — Left/Right changes the focused slideshow; the slideshow and button focus rings are visible.
- Touch swipe: PASS — a horizontal touch pointer sequence changed only the targeted Aesop slideshow.
- Single-slide controls: PASS — focused regression coverage confirms no previous/next controls render.
- Reduced motion: PASS — the visible video remained paused with autoplay and looping disabled.
- Viewport playback: PASS — the visible project's video played while off-screen project videos remained paused.
- Metadata/media collisions: PASS — no overlaps or horizontal overflow at 1440x1000, 1024x768, or 390x844.
- Mobile presentation: PASS — media uses the 15px gutters, project title follows the media, and category is hidden.

Information is the homepage footer-equivalent and no separate footer is rendered.
