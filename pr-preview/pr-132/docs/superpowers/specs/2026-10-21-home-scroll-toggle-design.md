# Storyblok homepage snap toggle

Add “Snap scrolling between projects” (`snap_scrolling`, boolean, false by default) to Home. This implements the on/off control approved in the conversation. Scope is the static homepage only; preserve unrelated Next.js changes.

Use the existing native vertical mandatory snapping and project centre alignment when on. Disable Lenis in this mode so wheel smoothing does not fight snapping. Off preserves current free scrolling. Reduced motion keeps free native scrolling. Existing INFO navigation temporarily suspends snapping. Hydration and prerendering must both carry the setting; observing the root attribute lets the controller respond regardless of fetch timing.

Provide a targeted additive migration with a durable backup and concurrent-edit check. If management API authentication is unavailable, add only the new field through the authenticated editor; existing schema versions remain available in Storyblok. Do not change Home content or publish it. Keep work local until commit and PR creation are authorized (authorized on 25 October 2026). Verify mapper defaults, hydration, prerender, Lenis teardown/restart, INFO navigation and browser scrolling against current saved Storyblok draft content on HTTPS port 8001.
