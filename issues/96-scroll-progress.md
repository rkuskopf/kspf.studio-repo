# Issue 96 — local review after PR #103 feedback

## Diagnosed causes

Native wheel movement followed by CSS snapping explained the original fast
start and separate settle. The first Lenis version instead had partial wheel
movement, an accumulated intent threshold, a delayed settle and a landing
cooldown. Commit `0f0bfa4` removed those phases in favour of one immediate eased
adjacent-project transition, but released gesture ownership when it landed.
Its 80ms packet window and 10% amplitude-rise heuristic could mistake residual
momentum for new input. A 1px → 1.2px tail fluctuation reproduced a second jump.
The prior tests incorrectly accepted renewed pulses within that same stream.

## Current local correction

A gesture owns its chosen project until vertical wheel input has been quiet
for 140ms, measured from the last packet. Landing only marks animation complete;
it does not release input ownership. Every packet, including noise below the
0.5px dead zone, extends continuity. Same-direction packets cannot choose a new
destination during that continuous stream, regardless of magnitude or whether
animation has landed. Direction reversal remains immediate. After input quiet,
the next intentional packet starts the next transition without a landing lock.
No accumulated intent threshold, renewed-pulse inference or additional library
is used. The experimental classifier and its fixtures were removed from scope.

Lenis owns the existing single eased transition and consumes native wheel input
synchronously. Native CSS snap stays disabled while the desktop controller is
active. Row geometry, media, navigation, mobile and reduced motion are unchanged.

## Direct Seconda inspection

Inspected the live archive DOM, computed styles and its public theme scripts on
1 October 2026. Seconda uses native `scroll-snap-type: y mandatory` on the root,
`scroll-snap-align: start` and `scroll-snap-stop: always` on collection rows.
Root scroll behaviour is `auto`; reduced motion disables snap. Its archive
script updates visibility and horizontal thumbnail navigation; it contains no
vertical wheel interception or Lenis controller. There are no Lenis damping
settings to copy. Its native snap feel remains the visual reference, while our
requested immediate easing and input ownership are implemented in Lenis.

Sources:
- https://www.seconda.paris/pages/archive
- https://www.seconda.paris/cdn/shop/t/4/assets/style_page.css?v=110179266305547459631788959224
- https://www.seconda.paris/cdn/shop/t/4/assets/script_collections.js?v=101686221807848249881788958758

## Verification and status

Regression coverage explicitly lands the animation, continues residual and
renewed-amplitude packets, checks that only one project is selected, then waits
for input quiet and confirms that the next tiny input advances one more project.
The real Lenis harness checks continuous post-landing tails, light flicks,
sustained slow input, strong momentum, immediate reversal, damped first frame,
navigation, keyboard cancellation and native fallbacks.

80 static-site tests and 97 Next.js tests passed. These are deterministic input
simulations, not certification of physical Mac trackpad feel. Physical review
against Seconda remains outstanding. Five existing files changed; no new vendor
library or fixture files. Correction remains uncommitted and unpushed.

Preview: https://localhost:8001/#work
