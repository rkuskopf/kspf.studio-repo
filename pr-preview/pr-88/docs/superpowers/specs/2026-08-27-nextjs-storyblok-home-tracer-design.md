# Next.js Storyblok homepage tracer

## Goal

Connect the existing Next.js App Router foundation directly to the real Storyblok `home` story. Normal use renders published content, while the local Storyblok Visual Editor renders saved draft content and refreshes after Save. This path must not read generated JSON or call the legacy sync or preview tooling.

## Scope constraints

- Draft preview is local-only and works through HTTPS `next dev`.
- Any request outside `NODE_ENV=development` renders published content, even if it contains Storyblok query parameters.
- The Storyblok public and preview delivery tokens remain server-side.
- The current root static site, generated-content pipeline, legacy preview server, and GitHub Pages deployment remain unchanged.
- A deployable Draft Mode endpoint, preview cookie, preview toolbar, and production-like preview environment belong to later deployment work.
- This slice renders only the existing `home` story fields. Composable Storyblok blocks and the full homepage migration belong to later tickets.

## Architecture

Add a focused Storyblok boundary under `next-app/lib/storyblok/` rather than importing the legacy `scripts/storyblok-delivery.mjs` module or adding the Storyblok React SDK.

The boundary has three responsibilities:

1. Validate whether a request is an authentic local Storyblok Visual Editor request.
2. Fetch exactly one `home` story with the correct server-only token and content version.
3. Validate and map the Storyblok response into a small typed `HomeContent` value that React can render without receiving credentials or raw transport details.

The App Router page remains a server component. A separate client component loads the Storyblok Bridge only for an authenticated local preview and reloads the page on Storyblok `change` and `published` events. Reloading causes the server component to fetch the latest saved draft.

## Visual Editor authentication

Storyblok appends a documented set of query parameters to an iframe preview URL:

- `_storyblok`: numeric story ID
- `_storyblok_tk[space_id]`: numeric space ID
- `_storyblok_tk[timestamp]`: Unix timestamp
- `_storyblok_tk[token]`: SHA-1 validation token

Preview detection must require all four fields as scalar strings. Arbitrary query parameters, `_storyblok` alone, partial `_storyblok_tk[...]` fields, arrays, malformed numbers, expired timestamps, timestamps more than 60 seconds in the future, and invalid signatures do not enable preview.

In development, the server reconstructs Storyblok's documented validation string:

```text
<space_id>:<STORYBLOK_PREVIEW_TOKEN>:<timestamp>
```

It hashes that string with SHA-1 and compares the binary digest with `_storyblok_tk[token]` using a timing-safe comparison. A valid signature must be no more than one hour old. The preview token is read only on the server and is never returned to React or the browser.

If a complete Storyblok parameter set arrives during development but `STORYBLOK_PREVIEW_TOKEN` is missing, the route reports a clear configuration error. A complete but invalid or expired parameter set safely falls back to published content. In production mode, preview validation is not attempted and the request is always published-only.

Reference: [Storyblok Visual Editor preview parameters](https://www.storyblok.com/docs/concepts/visual-editor.html) and [Storyblok preview parameter verification](https://www.storyblok.com/faq/how-to-verify-the-preview-query-parameters-of-the-visual-editor).

## Storyblok delivery

The server-only delivery module supports Storyblok's existing `eu`, `us`, `ca`, `ap`, and `cn` regions and rejects any other value.

For a published request it:

- requires `STORYBLOK_PUBLIC_TOKEN`;
- requests `cdn/stories/home` with `version=published`; and
- maps the response into `HomeContent`.

For an authenticated local preview it:

- requires `STORYBLOK_PREVIEW_TOKEN`;
- requests the same `cdn/stories/home` endpoint with `version=draft`;
- adds a current `cv` value and uses `cache: "no-store"` so a reload cannot reuse the previous saved draft; and
- maps the same response into the same `HomeContent` type.

The tracer uses request-time fetching for both modes. Caching and deployment revalidation policy are intentionally deferred until the Next.js application has a production-like deployment target.

`HomeContent` contains only:

```ts
type HomeContent = {
  storyId: number;
  storyUuid: string;
  title: string;
  metaDescription: string;
  intro: string;
};
```

The mapper accepts only the existing `home_page` component and rejects missing or incorrectly typed required fields. It does not reuse `content/home.json` or `scripts/storyblok-content.mjs`.

## Rendering and preview refresh

`next-app/app/page.tsx` receives Next.js `searchParams`, authenticates preview mode on the server, fetches the typed home content, and renders the current foundation layout from the Storyblok `title` and `intro` fields. It exports a pure presentation component so rendering can be tested without remote I/O.

When preview is active, a small client component loads Storyblok's official Bridge script from `https://app.storyblok.com/f/storyblok-v2-latest.js`. After the script loads, it subscribes to `change` and `published` and reloads the current URL. The Storyblok query parameters remain in the URL, so the following server render authenticates again and fetches a fresh draft.

The Next.js development command uses `--experimental-https`. Next.js responses allow `https://app.storyblok.com` as a frame ancestor so the local site can render inside the Visual Editor iframe.

## Secret boundary

- No Storyblok variable uses a `NEXT_PUBLIC_` prefix.
- Only the server-only Storyblok modules read `STORYBLOK_PUBLIC_TOKEN` or `STORYBLOK_PREVIEW_TOKEN`.
- The page receives mapped content plus an `isPreview` boolean.
- The Bridge component receives no token, Storyblok API URL, or raw story payload.
- Delivery errors name the failed operation and status without echoing request URLs, query strings, or credentials.
- Automated checks verify token-free rendered output and errors, while production-build verification scans emitted browser assets and HTML for token sentinels.

## Error handling

- Missing required tokens produce explicit configuration errors naming the missing variable without exposing its value.
- Unsupported regions fail before network access.
- Non-2xx Storyblok responses report the status and story slug but do not include the credential-bearing request URL.
- Missing stories, wrong Storyblok components, and malformed home fields fail with focused validation errors.
- Invalid Visual Editor signatures never grant draft access; they render the published version instead.

## Test strategy

Implementation follows red-green-refactor cycles for each boundary:

1. Preview authentication tests cover a valid signed Storyblok parameter set, actual parameter names, missing/partial fields, invalid signatures, stale/future timestamps, array values, development-only behavior, and missing preview configuration.
2. Delivery tests cover published and draft tokens, versions, region hosts, cache-busting, missing configuration, unsupported regions, HTTP errors, and response mapping.
3. Rendering tests prove typed published and draft content use the same React presentation path.
4. Bridge tests prove Save and Publish events reload and that no Bridge is registered outside preview.
5. Secret-boundary tests prove browser-facing modules and server-rendered markup contain neither environment variable access nor token sentinels.
6. Regression verification runs the full Vitest suite, the legacy Node test suite, a Next.js production build, and `git diff --check`.
7. When local credentials are available, live verification fetches the real published and draft `home` story and checks the HTTPS page plus a Storyblok-style signed preview URL. If draft and published content currently match, the test records the matching values while still proving the two API versions and tokens were used.

## Documentation

Update `next-app/README.md` with:

- `STORYBLOK_PUBLIC_TOKEN`, `STORYBLOK_PREVIEW_TOKEN`, and `STORYBLOK_REGION`;
- copying `next-app/.env.example` to the ignored `next-app/.env.local`;
- the HTTPS development command;
- the Storyblok Visual Editor base URL and `home` real path;
- Save-to-refresh behavior;
- published-only behavior outside local development; and
- exact focused test, full test, build, and live verification commands.

## Out of scope

- A deployable preview or Next.js Draft Mode endpoint
- Preview cookies, toolbar, or editor authentication beyond Storyblok's signed local parameters
- Unpublished keystroke-by-keystroke rendering
- Click-to-edit block attributes or a composable block resolver
- Other Storyblok stories, project routes, media delivery, or Cloudinary
- Changes to the static production site or its deployment workflow
