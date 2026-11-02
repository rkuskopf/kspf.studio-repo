# Issue #74: separate Next.js preview

Approved scope: implement the deployment proposal accepted in this chat on 2 November 2026. A preview does not require completion of the production migration.

## Deployment boundary

Use a new Vercel project with Root Directory `next-app`, Node 22, and source files outside the Root Directory included. Make `next-app` an npm workspace with its own manifest so Vercel detects the Next.js application normally. Keep one root lockfile and the existing root commands. A Node server is the fallback hosting option; Pages/static export cannot run the current dynamic routes. Do not attach kspf.au or change DNS. The current Pages workflows remain untouched.

## Draft authentication

Reuse Storyblok's signed query parameters and existing Bridge. Ordinary requests always fetch published content. Production-mode draft delivery requires `STORYBLOK_PREVIEW_ENABLED=true`, a server-only Preview delivery token, and a configured `STORYBLOK_SPACE_ID`. Require the signed space ID to match, preserve the one-hour expiry/future-skew checks, reject duplicate/invalid parameters, and never send delivery tokens to React. Drafts remain request-scoped with no cookies or persistent preview session. Do not run the deployment with NODE_ENV=development. Prevent referrer disclosure and caching of signed requests.

## URLs and media

Use SITE_URL, or Vercel's generated deployment URL, as the canonical origin; development defaults to localhost. Canonicals contain paths only, without editor query parameters. All pages carry no-index metadata and response headers because this application is a separate test deployment. Redirect `/home` and `/index.html` internally to `/` with temporary redirects. Unsupported legacy routes, Experience and CRM return 404 on this preview; their existing live endpoints are unchanged. Existing Cloudinary, Storyblok and absolute legacy media origins remain supported and explicitly documented as a temporary dependency. Do not move or re-upload assets.

## Verification and handoff

Test authentication and both loaders, run the Next and legacy suites, and install/build from a clean copy. Exercise the built production server against saved draft and published Storyblok data, including invalid/expired signatures, metadata, headers, redirects, unknown routes and asset availability. Use only the internal browser for desktop/mobile review. Document Vercel account setup, delivery-only credentials, editor URLs, deployment verification and rollback/deletion. Hosted checks remain incomplete until an account is connected and a real deployment is verified. Keep #74 open until those checks pass; keep #124/#128/#132 open and do not integrate their branches.

## Dependencies

#56/#58/#59 are implemented; #57's #68/#69 implementation has landed. Remove #64/#66 as prerequisites for an initial preview; retain them as live-cutover requirements. Additional media optimisation, project blocks and multisite features can follow deployment.
