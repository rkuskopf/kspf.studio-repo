# Separate Next.js preview (issue #74)

This deploys the existing Next.js application beside the static site. It does not
switch kspf.au, publish Storyblok content, change DNS, or require #124/#128/#132.
Keep #74 open until the hosted checklist below passes.

## Target and constraints

Use a **new Vercel project** for `rkuskopf/kspf.studio-repo`, rooted at `next-app`.
The application needs a Node runtime: both routes are dynamic and read Storyblok
on the server. GitHub Pages/static export cannot provide that path. Vercel handles
Next.js routing, HTTPS and isolated deployments without a custom domain.

The app is an npm workspace; its runtime dependencies are declared in
`next-app/package.json`, with the single lockfile at repository root. Shared
Storyblok/typography helpers live in `scripts/`. Include source outside the app
root when building. Next's tracing root includes the repository. Existing root
`npm run dev`, `npm run build`, `npm run start` and `npm test` continue to work.

A Node server running `npm ci`, `npm run build`, `npm run start` at repository
root is the alternative if Vercel's account/plan constraints are unsuitable.
The current GitHub Pages workflows stay unchanged.

Vercel Hobby is limited to personal, non-commercial use. Confirm an appropriate
plan for the studio portfolio; this change does not start a subscription.
See [plans](https://vercel.com/docs/plans/hobby),
[monorepos](https://vercel.com/docs/monorepos), and
[outside-root source](https://vercel.com/docs/monorepos/monorepo-faq).

## Account setup and import (Rowan)

1. Sign in to the intended Vercel account/team. Authorise the GitHub integration
   for this repository if required. Do not transfer or modify the live domain.
2. Import **this implementation branch**, `codex/74-nextjs-preview`, rather than
   merging it to main. Use the branch's GitHub tree URL in Vercel's Git repository
   import field. If importing from main to create the project shell, its first
   build will not contain this configuration: use **Deployments → Create
   Deployment** to select this branch and verify the exact deployed commit.
3. Suggested project name: `kspf-next-preview`. Root Directory: `next-app`.
   Application/Framework Preset: **Next.js** (select manually if it says Other).
4. Enable **Include source files outside of the Root Directory in the Build Step**
   in project build settings. Set Node.js to **22.x**.
5. `next-app/vercel.json` specifies installation `npm ci --prefix ..`, build
   `npm run build`, output `.next`. Keep these relative to `next-app`. Do not set
   the output to a static export directory. The root install includes build tools.
6. Add the delivery environment below to both **Preview** and **Production** for
   this new project. Vercel calls the default-branch environment Production even
   though this whole project is a separate test site. Re-deploy after changing
   settings or variables.
7. Use only the generated `*.vercel.app` URL. Do not attach kspf.au, www.kspf.au,
   rowan.kspf.au or configure DNS. Do not change the repository's Pages settings.

| Variable | Value / purpose |
| --- | --- |
| `STORYBLOK_PUBLIC_TOKEN` | Existing Public Delivery API token; server only. |
| `STORYBLOK_PREVIEW_TOKEN` | Existing Preview Delivery API token used by the Visual Editor to sign requests; server only. |
| `STORYBLOK_REGION` | Region of the existing space (`eu` currently; confirm against local delivery settings). |
| `STORYBLOK_PREVIEW_ENABLED` | Exactly `true` to permit authenticated deployed draft requests; omitted/false keeps production-mode published only. |
| `STORYBLOK_SPACE_ID` | Existing numeric space ID, required for deployed preview; copy from Storyblok Settings. |
| `SITE_URL` | Optional absolute HTTPS origin of a stable preview alias. Omit to use Vercel's generated `VERCEL_URL` per deployment. Never use kspf.au for this preview. |

Use the existing ignored `next-app/.env.local` as the credential source, without
posting tokens in chat, issues, PRs or screenshots. Never add `NEXT_PUBLIC_`
tokens or `STORYBLOK_MANAGEMENT_TOKEN`. Do not upload the repository-root `.env`.
Normal requests use the public token. Draft signatures select the preview token
only after validation. All Storyblok fetches currently use `no-store`; no publish
webhook/cache invalidation infrastructure is required for this preview.

## Storyblok editor

Keep the current live/local preview locations. Add the deployed origin as an
additional **Visual Editor preview location**, rather than replacing the live
space's primary preview URL. If account permissions/settings do not expose that
option, stop and ask Rowan to add it; do not overwrite the existing URL.
Set Home's Real path to `/`, Site's to `/` where needed, and the neutral tracer's
Real path to `/projects/product-design-tracer`. Do not repoint unrelated projects.
Select the new preview location in the editor. Its signed `_storyblok_tk[...]`
parameters must use the same Preview token configured on Vercel.

Ordinary requests always render published content. Draft delivery requires a
complete signed parameter set with a matching configured space, a valid digest,
a timestamp no more than one hour old and no more than 60 seconds in the future.
Repeated, incomplete or invalid parameters render published content. There is no
preview cookie: removing the parameters immediately returns to published content.
Saved changes refresh through the existing Storyblok Bridge. This preview does
not implement unsaved keystroke rendering or click-to-select editing enhancements.

`frame-ancestors` permits only `https://app.storyblok.com`. A no-referrer policy
prevents signed URLs leaking to media/font origins. Dynamic no-store responses
keep draft content out of shared caches. Vercel deployment protection is a
separate access layer: if it blocks the iframe, arrange an approved shareable
access method/session with Rowan. Do not disable protection or put bypass
secrets in CMS content. The HTTP checker can use an existing
`VERCEL_AUTOMATION_BYPASS_SECRET` via a request header for automated checks only;
that does not establish that the browser iframe is working.

## URL and asset behaviour

All pages have no-index/no-follow metadata and response headers. Canonicals use
only configured deployment origins and clean paths, without signed parameters.
`/home` and `/index.html` temporarily redirect to `/` on the same deployment.
Unknown projects, disabled/unpublished projects, `/experience` and `/crm` return
404 here. Existing live static case studies and CRM remain on their existing
host; this preview does not claim to have migrated those routes. Production
redirect decisions remain part of live cutover.

Media references are preserved. Cloudinary and Storyblok deliver most assets;
relative legacy media is resolved to absolute `https://kspf.au/` URLs. That is a
read-only temporary asset dependency, not a change to the live deployment. Do not
retire that origin while these URLs are in use. The shared Cloudinary resolver,
responsive variants, video request gating and performance budgets remain
#82/#78/#79/#77. The current video playback reset fix is still in unmerged #128.

## Repeatable verification

From repository root, with delivery credentials only in `next-app/.env.local`:

```sh
npm ci
npm test
node --test scripts/tests/*.test.mjs
npm run build
npm run start
```

To test production-mode drafts locally, set `STORYBLOK_PREVIEW_ENABLED=true`,
`STORYBLOK_SPACE_ID` and `SITE_URL=http://localhost:3000` in the ignored delivery
environment before starting. Do not change NODE_ENV to development.

Run the read-only checker against either a local production server or the hosted
origin. The origin argument contains no query parameters. Set SITE_URL to match
the server's configured canonical origin if it uses a stable alias:

```sh
node --env-file=next-app/.env.local scripts/verify-next-preview.mjs https://YOUR-DEPLOYMENT.vercel.app --with-drafts
```

It checks published Home/tracer, media and browser chunk responses, token absence,
headers, clean canonicals, same-origin redirects and 404s; then valid draft
requests, forged/duplicate/expired/future signatures and the return to published
content without parameters. It prints no signed URLs/tokens. It reads saved CMS
content only. Without `--with-drafts`, draft checks are explicitly NOT RUN.

Before marking #74 complete, record:

- [ ] Vercel project/team, exact source commit, deployment URL and Node/build settings.
- [ ] Hosted HTTP checker passes with `--with-drafts` and the configured canonical origin.
- [ ] Desktop and mobile internal-browser checks: Home/Information/Work, navigation
      if enabled in CMS, each slideshow, media playback, keyboard focus and 404.
- [ ] The actual Storyblok iframe loads the hosted draft and reloads after Save
      of a real pending edit. Do not publish or manufacture a content change just
      for this check; coordinate any saved edit with Rowan.
- [ ] No draft content or delivery token appears on unsigned URLs or browser bundles.
- [ ] Hosting logs reviewed without leaking query tokens; live Pages/DNS unchanged.
- [ ] Recovery instructions reviewed; #124/#128/#132 still open.

A build passing locally is not proof of a completed hosted deployment.

## Recovery

Record the previous successful deployment URL/commit before redeploying. To
recover a broken preview, redeploy that commit or point the **preview project's**
alias back to its last successful deployment. Remove the additional Storyblok
preview location if it is no longer wanted, preserving existing locations. To
disable draft access, set `STORYBLOK_PREVIEW_ENABLED=false` and redeploy.

For full preview removal, first remove only its additional editor location, then
have Rowan delete only the new preview project in Vercel and its integration if
no longer used. Never delete the repository, shared credentials, CMS components,
stories, Cloudinary assets or live domains. No DNS rollback is required because
this work changes no DNS. Leave legacy pipeline cleanup to #76 after #75.
