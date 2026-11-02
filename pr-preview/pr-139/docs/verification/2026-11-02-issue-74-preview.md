# Issue #74 implementation verification — 2 November 2026

Base: remote main `fbdedee96b6feb41be8e949603c476a3aff9b454`.
Branch: `codex/74-nextjs-preview`. Isolated managed worktree; original checkout
and its unrelated edits preserved. No merges, DNS changes, live deployment
changes, CMS schema/content writes or Storyblok publication performed.

## Local evidence

- Baseline: 151 Next.js tests passed.
- Updated application: 172 tests passed across 18 files.
- Legacy/script suite: 117 tests passed.
- Production builds pass from repository root and the `next-app` workspace.
- A fresh application-source copy with no node_modules, build output or delivery
  credentials passed `npm ci --prefix ..`, workspace build, then all 172 tests.
- The HTTP smoke checker rejected the previous build for missing noindex headers.
- Updated production-mode server: checker passes published Home and neutral
  project tracer, redirects, canonicals, noindex/referrer/iframe/cache policies,
  404s, six initial media URLs and eight browser script chunks. Response/chunk
  bodies were checked for the configured public and preview token values.
- Authenticated Home and tracer draft requests pass. Forged, duplicate, expired
  and excessively future-dated signatures render published content. Removing
  parameters returns to published delivery after a draft request.
- Internal-browser Next development review at 945px desktop and 390×844 mobile:
  six projects render, no horizontal document overflow, pointer next and keyboard
  previous change the ARCTERYX slideshow independently. Navigation is currently
  hidden by saved CMS settings; no CMS values were changed to force a test.
- Independent read-only code review found no actionable correctness/security
  findings; 51 focused checks passed in that review.
- Static HTTPS preview remains running at https://localhost:8001/; all five mapped
  files matched fresh saved Storyblok drafts during the handoff check.

## External state

#74's description and native blockers were updated. #57/#64/#66 no longer block
this initial preview; completed #58/#59 references remain. Cutover requirements
on #65 are unchanged. #124/#128/#132 remain open.

## Still required on the host

Vercel subsequently reported a successful deployment of implementation commit
`c863259be074bdeb8b00775e885c39b91e299679` under account/team `kspf1`, project
`kspf.studio-repo-next-app`. Its branch alias is:
https://kspfstudio-repo-next-app-git-codex-74-nextjs-preview-kspf1.vercel.app

An unauthenticated GET returns HTTP 302 to Vercel SSO; the internal browser
confirms the Vercel login page. Protection remains enabled. Hosted runtime/content
and editor checks are therefore pending authenticated access, not proven by the
successful build. The Vercel plugin is not connected in this work session.

The new Next.js Preview Checks GitHub Actions job passed on that commit. Existing
Cloudflare checks fail without accessible diagnostic logs; their cause is not
established here. The pre-existing Labeler fails because `.github/labeler.yml` is
missing. Neither provider configuration nor the labeler was changed by this PR.
Use the branch/app-root/environment instructions in `docs/nextjs-preview.md`.

Run the checker on the actual deployed URL, review desktop/mobile in the internal
browser, and verify the real Storyblok iframe and reload after an authorised
Save. Local signed HTTP requests do not establish hosted editor save/reload or
Vercel deployment-protection compatibility. Confirm the account plan is suitable.
Keep #74 open until all hosted acceptance criteria pass.
