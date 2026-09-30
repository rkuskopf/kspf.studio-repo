# Issue 96 — desktop scrolling, local review

## Diagnosis before editing

The correct draft preview is https://localhost:8001/#work. Before editing its
root computed to `scroll-snap-type: y mandatory` and `scroll-behavior: smooth`.
There was no wheel damping controller. `smooth-scroll.js` handles anchor
clicks only. Native wheel input moved the page first; browser snapping then
performed the settle. `scroll-snap-stop: always` limits traversal but does not
attenuate initial input. This explains the reported fast start and later settle.

## Implementation

- Vendored Lenis 1.3.26 from official npm, with integrity verification and MIT
  license. No CDN or build step. Only the static homepage imports it.
- Desktop with fine pointer/hover and no reduced-motion preference uses one
  Lenis instance. CSS native snapping and smooth behaviour are disabled while
  it is active. Row geometry, spacing, media sizes and Storyblok are unchanged.
- `wheelMultiplier: 0.65` attenuates the first event and every following event.
  `virtualScroll` caps individual events at 120px and clamps targets between
  the starting project and its neighbour. Zero/clamped events are still
  prevented so native momentum cannot escape the bounds.
- `lerp: 0.12` interpolates from the first animation frame. After 110ms without
  input, the same Lenis instance settles to the adjacent project. Short Hermite
  easing carries current velocity into the settle and ends at zero velocity.
  The generic snap plugin is not used: its nearest-target selection does not
  enforce the one-gesture adjacency policy.
- Release requires a 220ms event gap and a settled destination. Reversal
  retargets immediately. Browser WheelEvents do not expose portable physical
  gesture boundaries; this gap is a heuristic requiring Mac trackpad review.
- Information/Work keep history, focus, targets and 900ms navigation timing;
  desktop animation delegates to Lenis. Reduced motion is read live. Mobile
  and coarse-pointer scrolling remain native. Keyboard/touch cancel pending
  wheel settling. Slideshow code is untouched.

## Verification

- Correct 8001 preview: Lenis active, CSS snap `none`, behaviour `auto`; six
  rows still 471.71875px high, matching the baseline.
- Light automated scroll: first to adjacent project, scrollY 346 to 887.5;
  adjacent project centre error 0.03125px.
- Browser nav: INFO reached scrollY 0, then Work returned to 346. Next image
  changed the first project's video source, confirming slideshow interaction.
- Final suites: 78 static-site tests and 97 Next.js tests passed.
- Real Lenis under deterministic DOM/frame timing: first wheel is prevented,
  with no synchronous native jump. A 40px event becomes a 26px resisted target
  and moves less than 7px on its first 16ms frame. Tests cover light flick,
  continuous slow drag, strong decaying momentum, immediate reversal, nav,
  keyboard cancellation, live reduced-motion changes and mobile fallback.
- Seconda was opened directly and exercised with automated light/strong
  scrolls. A very light scroll left its window position unchanged; stronger
  input moved to 919.5px. This observational comparison cannot establish that
  its subjective physical trackpad feel has been reproduced.

## Still open

Browser debugger calls stalled, preventing useful live velocity traces.
Deterministic checks cannot certify physical Mac trackpad feel. Before closing
#96, compare the initial resistance and settle against
https://www.seconda.paris/pages/archive with actual light flicks, slow drags,
strong momentum and rapid reversal. Review navigation and slideshow controls
in the draft preview too. Implementation remains uncommitted; nothing is merged.
