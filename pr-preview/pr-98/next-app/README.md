# Next.js Storyblok homepage tracer

This directory contains the App Router replacement being developed alongside
the current static site. The static homepage and GitHub Pages workflows remain
the production path until the migration is ready to cut over.

The `/` route reads the existing `home` story directly from Storyblok. Normal
requests use published content. Saved draft content is available only inside
the local Storyblok Visual Editor while `next dev` is running; non-development
runtimes always stay published-only.

## Local environment

Copy the credential-free example to an ignored local file:

```sh
cp next-app/.env.example next-app/.env.local
```

Set:

- `STORYBLOK_PUBLIC_TOKEN` to a Public Content Delivery API token for normal
  published rendering.
- `STORYBLOK_PREVIEW_TOKEN` to a Preview Content Delivery API token for signed,
  local Visual Editor requests.
- `STORYBLOK_REGION` to the space region: `eu`, `us`, `ca`, `ap`, or `cn`.

Do not use `NEXT_PUBLIC_` variables for either token. The Next.js server reads
them and passes only validated content to React.

This file is the delivery environment only. Keep its values limited to the
public token, local preview token, and region shown above.

## Run the local site

From the repository root:

```sh
npm install
npm run dev
```

`npm run dev` starts Next.js with its built-in experimental HTTPS support. Open
[https://localhost:3000/](https://localhost:3000/) and accept the generated
local certificate once. A normal request should show the published `home`
story.

## Configure the local Storyblok Visual Editor

In the Storyblok space:

1. Open **Settings -> Visual Editor**.
2. Set the Preview URL to `https://localhost:3000/`.
3. Open the `home` story, open **Config**, and set its Real path to `/`.
4. Keep `npm run dev` running and open the story's Visual view.

Storyblok appends its signed `_storyblok` and `_storyblok_tk[...]` parameters
to the iframe URL. The Next.js server validates the complete signature with the
preview token before requesting `version=draft`. This applies to the homepage
and an enabled project page. Arbitrary, partial, invalid, expired, or repeated
parameters render published content instead. Every non-development runtime also
renders published content, even if a request contains otherwise valid Visual
Editor parameters.

Select **Save** after editing the story. The Storyblok Bridge reloads the iframe
and the server fetches the latest saved draft without using generated JSON or
the legacy preview server. Publish events reload in the same way. Unsaved
keystroke-by-keystroke rendering is outside this slice.

There is intentionally no deployable Draft Mode endpoint, preview cookie, or
preview toolbar in #58. Those belong with the later production-like preview and
deployment work.

## Project-page delivery

The project-page tracer renders at
`/projects/product-design-tracer`. It remains a normal published page for
ordinary requests. While `npm run dev` is running, open the tracer in the
Storyblok Visual Editor with its Real path set to
`/projects/product-design-tracer`; Storyblok supplies the signed query
parameters that permit the server to render its saved draft.

The route intentionally returns 404 for an unknown slug, a missing or
unpublished story in published delivery, a non-`project` story, or a project
without `page_enabled === true`. Existing homepage projects therefore remain
unroutable until explicitly enabled.

The editor-facing migration and its separate root environment are documented in
[`docs/storyblok-setup.md`](../docs/storyblok-setup.md). Run the delivery app
with only this directory's `.env.local` values:

```sh
npm run dev
```

The project-page renderer only classifies and renders the supplied image or
video asset. Cloudinary references, transforms, responsive variants,
dimensions, and loading policy remain the responsibility of #82.

## Project-page rollback

Do not delete the additive Storyblok fields during rollback. Disable and
unpublish only `projects/product-design-tracer`, then remove or revert the
Next.js route if required. Existing projects and the static homepage retain
their original behavior.

## Verify

Run the Next.js tests, unchanged legacy suite, schema verification, and
production build:

```sh
npm test -- --reporter=verbose
node --test scripts/tests/*.test.mjs
node scripts/verify-storyblok.mjs
npm run build
git diff --check
```

For live verification with `next-app/.env.local` populated:

1. Run `npm run dev` and confirm `https://localhost:3000/` reports
   `data-storyblok-content="published"` in the page markup.
2. Open the `home` story in Storyblok's Visual Editor and confirm the iframe
   reports `data-storyblok-content="draft"`.
3. Save a draft change and confirm the iframe reloads with the saved value.
4. Remove or corrupt one `_storyblok_tk[...]` value and confirm the same URL
   renders published content.
