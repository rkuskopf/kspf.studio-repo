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

## Global typography (issue #105)

The single `site` story owns `site_settings.typography`, a `typography_settings`
block with Display, Heading, Body, Navigation, Metadata / UI and Caption roles.
Each role contains at most one `typography_style`. Font families are controlled
keys from `scripts/typography-registry.mjs`, shared with the schema and root font
loader. Courier New, Helvetica/Arial and Times New Roman use system fonts;
Akzidenz Grotesk uses the site's existing Adobe kit. No CMS string becomes a font
URL or raw CSS value.

Run the additive schema migration with management credentials in the root `.env`:

```sh
node --env-file=.env scripts/setup-typography.mjs          # read-only plan
node --env-file=.env scripts/setup-typography.mjs --apply  # schema only
```

The migration adds the two nested components, the Typography section and
Home/Information font-weight selectors. It preserves other schema fields, rejects
conflicts before writing, is safe to rerun, and never seeds, replaces or publishes
stories. Add the Typography block and desired role blocks in the Site story;
leave fields blank to retain the current appearance.

| Role / use | Default font | Weight | Size | Line height | Tracking / transform |
| --- | --- | --- | --- | --- | --- |
| Display / project title | Courier New | 400 | `clamp(2.5rem, 8vw, 7rem)` | 0.95 | -0.04em / none |
| Heading / information headings | Courier New | 400 | 12px | 1.35 | normal / none |
| Heading / project rich-text headings | Courier New | browser heading default | browser heading default | inherited | normal / none |
| Body / homepage intro | Courier New | 400 | 12px | 1 | normal / none |
| Body / information copy | Courier New | 400 | 12px | 1.35 | normal / none |
| Body / project rich text | Courier New | 400 | `clamp(1rem, 2vw, 1.25rem)` | 1.5 | normal / none |
| Navigation / links | Akzidenz Grotesk | 500 | 12px | 1 | normal / uppercase |
| Metadata / homepage labels and counters | Courier New | 400 | 12px | 1.2 | normal / none |
| Metadata / project metadata and tags | Courier New | 400 (labels 700) | 15px | 1.2 | normal / none |
| Caption / media captions | Courier New | 400 | 0.875rem | 1.4 | normal / none |

A configured property applies to every use of its role. Blank or invalid numeric
properties resolve to `null` in the typed mapping and omit their CSS token,
retaining the context defaults above. Unknown fonts and transforms use their role
defaults. Sizes accept 8–200px, line height 0.5–3, letter spacing -0.2–1em, and
weights 300/400/500/700. Positive lower bounds are enforced by the frontend
mapper: Storyblok treats empty optional Number fields as zero when applying
minimum validation, so their schema omits those minimums. Numeric editor steps
are 0.01px for size and 0.001 for line height / tracking. With both sizes configured, size interpolates between
640px (mobile) and 1440px (desktop), bounded by the endpoints. A single configured
size applies at every width. Home/Information weight overrides default to inherit
and affect only the individual link's `font-weight`.

Both loaders fetch the same site record using the same delivery version/token as
the page. Signed local Next.js draft preview fetches saved settings without cache;
reload the page after saving the separate Site story. The Storyblok Bridge reloads
on save/publish events from the current editor. Preview the Next.js site with
`npm run dev` (HTTPS, normally port 3000), not the static-site server on port 8001.
The token mapper accepts the resolved site's settings; future hostname resolution
can choose a different record without changing text-role CSS or components.

## Composable Home blocks (issue #59)

Home's **Page blocks** contains one Information, Navigation and Work block in
any order. Information and Navigation reference the existing Site settings
story. Work automatically includes canonical `projects/` records marked
**Show on home**, using their existing order. Adding a project does not require
adding it to another list. Caption presets and visibility remain shared Home
controls; individual caption-position controls belong to #120.

Reordering changes the Next homepage DOM order. Adjacent Navigation → Work
keeps the current navigation overlay; standalone Navigation uses normal flow.
Starting section still targets Information or Work. Hidden navigation takes
no space. Stories with no body use the legacy order; an explicitly empty or
invalid body fails clearly.

Prepare the migration from the root environment (management credentials stay
outside `next-app`):

```sh
node --env-file=.env scripts/setup-homepage.mjs
```

The default is a read-only plan. After reviewing the actions, apply explicitly:

```sh
node --env-file=.env scripts/setup-homepage.mjs --apply
```

Apply first saves exact Home, Site and component snapshots in ignored
`.storyblok-backups/`, adds compatible schema definitions, then saves Home as a
draft. It preserves legacy fields, translations, caption controls and all
project/Site content. Conflicting schemas, changed source data or a different
existing body are preserved and reported. Repeating an equivalent migration
is a no-op. There is no publish option.

Review the saved draft in the **Next.js** Visual Editor before publication.
`https://localhost:8001/` is the static preview: it keeps reading legacy fields
and ignores Page blocks. Publishing/reordering Page blocks therefore affects
Next only until the separate production cutover.

For rollback, read the selected backup's `home.content`, compare it with the
current Home draft, and save that backed-up content as a draft using the
existing Management API `updateStory(home.id, {content})` method. Review before
publishing. Do not delete shared components or project/Site stories. Removing
legacy fields and the fallback belongs to cutover cleanup.
