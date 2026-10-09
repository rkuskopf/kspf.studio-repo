# Horizontal Panel Navigation Design

## Goal

Replace the homepage's vertical Info jump and Index anchor with a single, continuous three-panel interaction:

```text
[ Info ] [ Home ] [ Case Studies ]
```

The site opens on Home. Navigation clicks move one viewport left or right so the adjacent panel feels physically connected, without loading another page.

## Scope

This first version includes:

- an Info panel to the left of Home;
- the current homepage in the centre;
- a Case Studies panel shell to the right;
- fixed `Info`, `kspf`, and `Case Studies` navigation;
- click- and keyboard-triggered panel movement;
- reduced-motion support; and
- preservation of the homepage's existing vertical project navigation.

Project-tile layout and Case Studies content are explicitly deferred. The right panel will contain an empty content region ready for that later design, without temporary placeholder copy.

## Interaction

- The initial view is Home in the centre.
- Clicking **Info** moves the content rail right by one viewport, making the viewport feel as though it has travelled left to the Info panel.
- Clicking **Case Studies** moves the rail left by one viewport to reveal the right panel.
- Clicking **kspf** returns the rail to Home from either side.
- Horizontal movement is triggered only by the navigation. Wheel, trackpad, touch-drag, and swipe gestures do not move between panels.
- The navigation remains fixed in the same viewport position while the content moves beneath it.
- Returning to Home restores its existing vertical scroll position rather than jumping to the first project.
- The active navigation item is visually and semantically identified.

Panel state is reflected in the URL hash: `#info`, no hash for Home, and `#case-studies`. Back and forward navigation restore the corresponding panel without a page load. An unknown hash falls back to Home.

## Motion

The rail uses one CSS transform transition as the sole owner of horizontal movement. Its three positions are `0`, `-100vw`, and `-200vw`, with Home initially positioned at `-100vw`.

The transition lasts 1000 ms and uses `cubic-bezier(0.65, 0, 0.35, 1)`. A new navigation click during a transition retargets the rail from its currently rendered position instead of snapping or queuing animations.

When `prefers-reduced-motion: reduce` is active, the transform changes immediately with no transition. The homepage must not use `data-force-scroll` or another override to force the horizontal animation.

## Structure and Scroll Ownership

The homepage becomes a viewport-height stage containing a three-panel rail. Each panel is one viewport wide. The stage clips horizontal overflow so adjacent panels and horizontal scrollbars are never exposed.

Each panel owns its vertical overflow independently:

- Home retains the current full-viewport project blocks and vertical snap behavior.
- Info scrolls vertically only if its content exceeds the viewport.
- Case Studies can scroll vertically once tiles are added later.

Moving vertical scroll ownership into the active panel prevents the new horizontal transition from competing with the document's current CSS smoothing, mandatory vertical snapping, or `smooth-scroll.js`. The old Info-to-footer animation is removed from the homepage path.

The existing information content is moved into the left panel without redesigning its copy or layout. Existing case-study pages and links remain unchanged.

## Accessibility and Resilience

- Navigation remains reachable and operable by keyboard.
- Each control names its destination and exposes the active state.
- Offscreen panels are removed from the keyboard and accessibility flow using `inert` and `aria-hidden`; the active panel is restored before focus can enter it.
- Focus remains on the clicked navigation control after movement, avoiding an unexpected focus jump.
- The layout uses dynamic viewport units where supported and falls back to standard viewport units.
- If JavaScript fails, the three content regions remain readable in normal document flow and their navigation anchors still reach them.

## State Flow

One small homepage controller owns panel state:

1. Read the clicked navigation destination or the current URL hash.
2. Validate it as Info, Home, or Case Studies.
3. Update the rail state and active navigation state.
4. Update `inert` and `aria-hidden` on all panels.
5. Synchronize the URL without reloading the page.

CSS owns the visual positions and motion. The controller does not animate individual frames with `requestAnimationFrame`.

## Verification

Browser testing must confirm:

- the site loads centred on Home with no initial flash of Info;
- Info enters continuously from the left and Case Studies from the right;
- kspf returns to Home from both panels;
- repeated and mid-transition clicks retarget smoothly;
- trackpad, wheel, touch, and swipe gestures cannot change panels;
- Home's vertical snap navigation still works and its scroll position survives a panel round trip;
- no horizontal scrollbar or adjacent-panel edge appears at desktop or mobile widths;
- back, forward, direct hashes, reloads, and unknown hashes select the correct panel;
- keyboard navigation cannot enter an offscreen panel;
- reduced-motion mode changes panels immediately; and
- existing case-study links and layouts remain unaffected.

Test at representative widths of 1440, 1024, 768, and 390 pixels, including Safari's dynamic mobile viewport behavior.
