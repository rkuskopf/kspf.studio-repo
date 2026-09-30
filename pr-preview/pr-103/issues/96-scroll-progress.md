# Issue 96 — local review after PR #103 feedback

## Diagnosed causes

The first implementation used native wheel movement followed by CSS snap.
The Lenis follow-up removed that native phase but still had two JavaScript
phases: partial wheel targets with `INTENT_PX = 12`, then settling after
`INPUT_IDLE_MS = 110`. Small inputs visibly crept until the separate settle
committed the rest of the row. `GESTURE_GAP_MS = 220` then kept same-direction
input clamped after arrival, creating the reported lockout.

## Current implementation

- Input below a tiny 0.5px normalized noise dead zone is consumed without moving.
- The first intentional vertical packet immediately chooses the adjacent
  project. Lenis runs one short Hermite curve all the way to that point.
- Input magnitude does not change the motion curve. There is no partial wheel
  target, cumulative intent threshold, delayed settle timer or landing cooldown.
- Same-direction input during the transition is consumed without retargeting.
  Direction reversal immediately chooses the project just left.
- Lenis completion releases the active gesture immediately. A separate packet
  history rejects sustained/decaying input trains after landing, while a renewed
  pulse or reversal starts another transition immediately. The 80ms packet-gap
  check identifies continuity between input events; it is not a delay from
  landing. Browser WheelEvents have no portable momentum-phase signal, so a
  genuinely new smaller pulse that resembles an ongoing tail can still be
  ambiguous. Physical trackpad review remains necessary.
- Native CSS snap stays disabled while Lenis is active. Information/Work,
  mobile/coarse-pointer native scrolling, reduced motion, keyboard cancellation,
  row dimensions, spacing and slideshow logic retain their existing behaviour.

## Verification and status

Regression tests failed against the previous implementation before changes.
The real Lenis test harness now checks identical first-frame motion for tiny
and normal input, immediate navigation after landing, slow sustained input,
strong decaying momentum, direction reversal, Information navigation, keyboard
cancellation and reduced-motion/mobile fallback. Policy tests cover residual
momentum and renewed input immediately after landing.

Preview: https://localhost:8001/#work

Changes are uncommitted. No PR merge or review-comment reply has been made.
Issue #96 remains open pending physical Mac trackpad comparison against
https://www.seconda.paris/pages/archive and review of the updated motion.
