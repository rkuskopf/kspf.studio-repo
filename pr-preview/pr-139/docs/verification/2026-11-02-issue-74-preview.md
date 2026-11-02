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

## Hosted preview verification — 3 November 2026

Vercel reports a successful redeployment of commit
`0469fa4f6b20ade449a6cd859f8f623c4289cce5` under account/team `kspf1`, project
`kspf.studio-repo-next-app`. Its branch alias is:
https://kspfstudio-repo-next-app-git-codex-74-nextjs-preview-kspf1.vercel.app

The user authorised adding the existing Public and Preview Delivery API tokens to
this Vercel project, scoped only to `codex/74-nextjs-preview`, together with EU
region, the existing space ID and explicit deployed draft enablement. The values
are stored as Vercel secrets; no management token was sent. Deployment protection
remains enabled. The internal browser loaded the branch alias and confirmed:

- Published Home renders six projects and a visible image; the project tracer
  route renders published content.
- A fresh, valid Storyblok-signed request for each route renders saved draft
  content. A forged Home signature and a subsequent clean visit render published
  content. The signed URL and token values were not recorded.
- Home has `noindex, nofollow, noarchive`; its canonical points to the immutable
  deployment origin, with the project path preserved for the tracer.
- At 390px wide, the homepage has no horizontal document overflow. The hosted
  ARCTERYX next control changed slide 1 to slide 2 and its image URL.
- `/home` redirects to `/`; an unknown path shows the 404 page.

Storyblok's current plan allows two extra Visual Editor preview URLs, and both
are assigned to local Next.js previews (`localhost:3000` and `localhost:3001`).
The default remains the static `https://localhost:8001/`. A user choice about
which local URL to replace is pending; no CMS preview setting has been changed.
The real editor iframe, Save and reload still need verification before closing
#74. These checks must also confirm deployment-protection compatibility.

The new Next.js Preview Checks GitHub Actions job passed on that commit. Existing
Cloudflare checks fail without accessible diagnostic logs; their cause is not
established here. The pre-existing Labeler fails because `.github/labeler.yml` is
missing. Neither provider configuration nor the labeler was changed by this PR.
Use the branch/app-root/environment instructions in `docs/nextjs-preview.md`.

The browser checks above cover the deployed application. The scripted checker
and a real Storyblok editor Save/reload have not run against the hosted URL. Keep
#74 open until the editor checks pass and the account plan is confirmed suitable.

## Follow-up parity correction — 3 November 2026

Rowan identified tighter project-title leading and missing desktop wheel glide
in the hosted preview. The live AESOP title computes to 12px type with 18px
line height; the previous Next.js title computed to 12px with 14.4px line
height. The Next.js homepage now uses 1.5 leading for project titles. It also
uses the same Lenis 1.3.26 free wheel interpolation settings as the live
homepage on fine-pointer desktop, while mobile and reduced-motion users retain
native scrolling. The existing live static files remain unchanged.

Local Next.js build and all 172 tests pass. In the internal browser, the local
Next.js title now computes to 18px leading; a wheel gesture adds `lenis-smooth`
and continues moving after the input, while a 390px viewport disables Lenis
and has no horizontal overflow. Hosted parity needs checking after deployment.
