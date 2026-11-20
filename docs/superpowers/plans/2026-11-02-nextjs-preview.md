# Next.js preview implementation plan

> **For agentic workers:** Use executing-plans inline, then requesting-code-review before PR creation.

**Goal:** Prepare and verify a separate production-mode Next.js preview under #74.

**Architecture:** Keep the static deployment untouched. Use an npm workspace and Vercel app root, extend signed request authentication behind explicit deployment configuration, and keep preview URLs and indexing policy separate from live production.

**Tech stack:** Next.js App Router, TypeScript, npm workspaces, Vitest, Storyblok Delivery API, Vercel.

## Global constraints

- Preserve all edits in the original checkout. Branch from remote main.
- Keep #124, #128 and #132 open. No merging, DNS changes, kspf.au changes or Storyblok publication.
- Server credentials only; no management token in the application environment.
- User has approved implementation and a separate PR. Hosting account setup may require user involvement.

## Tasks

- [x] 1. Baseline: install and run `npm test -- --reporter=dot` in the managed worktree.
- [x] 2. Authentication: extend preview tests to accept valid signed production requests only with explicit enablement and matching configured space. Add loader integration coverage for Home and project pages. Watch the new tests fail, then extend `resolveStoryblokVersion` and pass the new environment fields through both loaders. Re-run focused tests.
- [x] 3. URLs: test canonical origin validation, project canonicals, no-index/referrer headers and temporary internal redirects. Implement `lib/deployment.ts`, metadata and Next config changes, then run the focused tests. No cross-domain redirects.
- [x] 4. Hosting: add the `next-app` workspace manifest, move runtime dependencies to it, update the root lockfile, add the app's Vercel configuration and explicit tracing root for shared scripts. Run root and workspace build commands.
- [x] 5. Verification: document and add a repeatable HTTP smoke command for a built/hosted deployment. Exercise unsigned published delivery, valid draft delivery, invalid/expired/duplicate signatures, canonical/header/redirect/404 behaviour and token absence. Scan public browser assets for credentials. Run all tests and a clean-copy npm install/build; inspect desktop/mobile via the internal browser.
- [x] 6. Handoff: document exact account/environment/editor configuration, rollback, current legacy asset dependency and outstanding hosted checks. Update #74's body and native blocker relationships. Request independent code review, resolve findings, commit/push only this branch and create a separate PR without closing #74.

Account connection is an external prerequisite to actual deployment. Continue all repository work while it is unavailable; report hosted status precisely rather than claiming deployment success.

Implementation PR: #139. Vercel build succeeds; authenticated hosted content/editor verification remains pending and #74 remains open.
