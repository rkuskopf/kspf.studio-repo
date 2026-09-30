# Issue 96 — desktop scrolling

First local pass, 2026-09-30:

- Desktop project targets use `scroll-snap-stop: always`; mobile rules and row geometry are unchanged.
- Scrolling manually from Information into Work now clears `is-info-scrolling`. Previously that class persisted and disabled native project snapping until a Work navigation click.
- Browser verification at 1280px confirms desktop targets compute to `always` and the root returns to `y mandatory` after entering Work.
- Existing test suite: 97 tests passed. These tests do not prove physical trackpad gesture behaviour.

Still required before closing the issue:

1. Test native snap stops with a Mac trackpad: light flick, slow drag, strong momentum, immediate reversal.
2. Add and tune desktop damping against https://www.seconda.paris/pages/archive. Lenis was evaluated from its official documentation (https://github.com/darkroomengineering/lenis); it provides smoothing and a snap plugin, but must replace native snapping while active, not compete with it. No dependency has been added in this first pass.
3. Verify Information/Work navigation, slideshow controls, mobile touch and reduced motion after adding damping.

The issue remains open. No subjective reference-feel comparison or one-gesture guarantee is claimed yet.
