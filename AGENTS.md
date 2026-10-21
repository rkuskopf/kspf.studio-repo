# Local site review

- Use https://localhost:8001/ for local review of the static KSPF site. Start its Storyblok-connected HTTPS preview with `node --env-file=.env scripts/preview-storyblok.mjs`.
- Do not start or offer the plain static server on port 8000 unless Rowan explicitly requests it. Its checked-in content can be stale and is not an appropriate default for CMS review.
- Verify the 8001 preview is serving current saved Storyblok draft content before providing a review link. If it cannot start, report the blocker instead of silently falling back to port 8000.
- Before finishing work and handing it back to Rowan for review or approval, ensure the Storyblok-connected HTTPS preview is running at https://localhost:8001/. Start it if needed, verify it responds with current saved Storyblok drafts, and include the review link in the handoff. Keep the server running after the agent's turn ends; do not hand back a stopped or unverified preview. If startup or verification fails, report the blocker explicitly.
- For Next.js-specific work, use the Next.js development server and clearly identify it; the 8001 server previews the static site, not Next.js.
- Use a deployed PR preview when Rowan asks to review with published Storyblok content.

# Browser use

- Use the Codex internal (in-app) browser for all browser work and site review in this repository unless Rowan explicitly requests another browser.
- Do not launch or switch to Chrome, Safari, Edge, an external browser, or a separate headless browser session without that explicit instruction. If the internal browser cannot complete an action, report the limitation instead of silently switching browsers.
