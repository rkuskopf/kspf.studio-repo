# Storyblok project-page tracer design

**Issue:** #72 — Ship a Storyblok project page with header, text, and media blocks
**Status:** Approved for implementation planning
**Date:** 2026-08-28

## Goal

Make `project` the canonical Storyblok record for a piece of work. Every project
continues to support the preview-level fields used by the current static homepage.
An opted-in project can additionally supply a long-form Next.js project page from
the same record.

Prove the model with one new, minimal `projects/product-design-tracer` story. Do
not migrate, update, or use the legacy Aesop project or `case_study` story as the
new model.

## Current boundaries

- The static HTML site and GitHub Pages workflows remain the production path.
- Existing `project` stories supply the current homepage feed through the legacy
  Storyblok-to-JSON pipeline.
- The Next.js app lives under `next-app/` and reads Storyblok directly on the
  server.
- Issue #58 established the delivery boundary: published requests use the public
  token, authenticated local Visual Editor requests use the preview token, only
  mapped content crosses into React, and the token-free Bridge reloads saved
  drafts.
- Existing `project` stories, including Aesop, do not contain the new page fields
  and must remain unroutable unless an editor later enables them explicitly.
- The legacy `case_study` content type and `case-studies/` folder remain intact
  for the current site but do not participate in the new project-page path.

## Canonical `project` model

The existing `project` component is extended additively. All current fields keep
their names, types, editor positions, values, and legacy mapping behavior:

- `title`
- `display_name`
- `category`
- `description`
- `view_url`
- `slides`
- `alt`
- `show_on_home`
- `order`

The component gains these page fields after the existing fields:

| Field | Storyblok type | Purpose |
| --- | --- | --- |
| `client` | Text | Client or organisation shown in the project header. |
| `year` | Text | Display value that permits a year or year range without schema changes. |
| `discipline` | Text | Primary portfolio discipline. |
| `thumbnail` | Asset | Stable editorial thumbnail metadata for future project feeds and page metadata. |
| `tags` | Blocks restricted to `project_tag` | Ordered, free-form tags without defining a premature global taxonomy. |
| `page_enabled` | Boolean, default `false` | Explicit opt-in for the dynamic Next.js page. |
| `body` | Blocks restricted to `project_header`, `text`, and `media` | Ordered long-form page composition. |

The new nestable `project_tag` component contains one required `label` text
field. Tags are outside `body`, so they remain stable project metadata.

The new root fields remain optional at the Storyblok schema level because making
them globally required would interfere with editing the existing preview-only
records. The delivery mapper treats `title`, `client`, `year`, `discipline`, a
valid `thumbnail`, and a valid `body` as required whenever
`page_enabled === true`. Tags may be empty, but they always map from the separate
metadata field rather than from body content.

`page_enabled` is the routing boundary. Missing, `false`, or incorrectly typed
values do not opt a story into a page. Adding fields to the schema must not
change any existing story value or make any current project routable.

## Initial body blocks

### `project_header`

`project_header` is a marker block with no duplicated editorial fields. Its React
component receives the parent project's mapped metadata and renders the title,
client, year, discipline, and tags at the block's position in `body`.

The tracer contains exactly one header. The delivery mapper rejects an enabled
project with zero or multiple `project_header` blocks so an editorial mistake is
visible instead of producing an ambiguous page.

### `text`

`text` contains one required Storyblok Richtext field named `content`. The
server-rendered React component uses `StoryblokServerRichText` from
`@storyblok/react`. The React SDK is not used for delivery, authentication, or
environment access.

The first tracer needs only a short paragraph, while the SDK renderer preserves
the native Storyblok document model for later authoring.

### `media`

`media` contains:

- one required image-or-video Asset field named `asset`, with external asset URLs
  allowed for the existing Storyblok–Cloudinary boundary;
- required `alt` text for images;
- optional `caption` text.

The typed mapper accepts only HTTPS asset URLs, determines image versus video
from Storyblok asset metadata and the filename, and rejects unsupported media.
The component renders semantic `<figure>`, `<img>` or `<video>`, and
`<figcaption>` markup. Interactive galleries and slideshows remain in #71.

## Fresh tracer story

Create only one new story under the existing `projects/` folder:

- Name: `Product design tracer`
- Slug: `product-design-tracer`
- Component: `project`
- Existing preview fields:
  - `title`: `Product design tracer`
  - `display_name`: `Product design tracer`
  - `category`: `Product Design`
  - `description`: a short statement that this is the schema tracer
  - `show_on_home`: `false`
- Page metadata:
  - `client`: `KSPF`
  - `year`: `2026`
  - `discipline`: `Product design`
  - `tags`: `Tracer`, then `Prototype`
  - `page_enabled`: `true`
- Body order:
  1. `project_header`
  2. one `text` block with a short, factual tracer paragraph
  3. one `media` block

Use one neutral, non-Aesop asset already available through the current
Storyblok–Cloudinary boundary. The `thumbnail` and `media` block may reference
the same asset object; no asset is re-uploaded or duplicated. If no suitable
existing asset is available, stop before uploading or inventing portfolio work
and report that narrow content blocker.

The story is created as a draft first. After draft preview and route checks pass,
publish the same story and verify the public route. Do not leave a deliberately
different draft behind after final verification.

## Schema and story migration

Add a focused, dry-run-first setup command for #72 instead of broadening the
legacy seed/import path.

The command must:

1. Read credentials only from the repository-root management environment.
2. Fetch the live `project` component and relevant nestable components.
3. Create `project_tag`, `project_header`, `text`, and `media` only when absent.
4. Merge the approved new fields into the live `project` schema while preserving
   every existing field and component setting.
5. Refuse to reuse a same-named component whose type or schema conflicts with the
   approved model.
6. Create `projects/product-design-tracer` only when that slug is absent.
7. Refuse to replace an existing tracer story automatically.
8. Never issue a story update for Aesop or any other existing project.
9. Require a separate explicit publish flag after draft verification.
10. Print a concise plan and resulting IDs without printing tokens or
    credential-bearing URLs.

The checked-in `STORYBLOK_COMPONENTS` schema also receives the additive model so
a new space would be created correctly. The existing broad setup script remains
non-destructive toward components already present in a live space.

Migration tests use an injected fake management API to prove the merge preserves
unknown and legacy fields, the default run is read-only, reruns are idempotent,
name collisions fail closed, and no existing story receives a write.

## Direct delivery and route

Add `next-app/app/projects/[slug]/page.tsx` for
`/projects/product-design-tracer` and future enabled projects.

The route reuses #58's boundaries:

1. Resolve `published` or authenticated local `draft` from the existing signed
   Visual Editor query parameters.
2. Select only the token for that version on the server.
3. Validate the route segment against the canonical lowercase slug pattern before
   making a request.
4. Fetch `projects/<slug>` directly from the Storyblok Content Delivery API with
   `cache: "no-store"`; draft requests also use the current cache version.
5. Validate and map the response into a discriminated `ProjectBlock` union and
   `ProjectPageData` object.
6. Pass mapped data, never raw stories or credentials, to React.

The page stays request-rendered so signed Visual Editor parameters can select a
saved draft. In preview it mounts the existing token-free Bridge component,
which reloads after Storyblok Save or Publish events.

## Typed rendering

The mapped page data contains:

- story ID and UUID;
- canonical slug;
- preview/homepage fields needed by the record boundary;
- page metadata;
- ordered `ProjectBlock[]`;
- `isPreview`.

Each block keeps its Storyblok `_uid` as the React key. A focused block resolver
switches on the discriminant and renders `ProjectHeader`, `ProjectText`, or
`ProjectMedia`. Rendering iterates the mapped array without grouping or sorting,
so Storyblok order is React order.

The page uses minimal semantic layout and neutral CSS. It does not establish the
final Rowan portfolio visual system, recreate the legacy case-study layout, or
anticipate the two-column, embed, gallery, or slideshow designs from #70 and #71.

## Not-found and invalid-content behavior

The App Router calls `notFound()` for:

- an invalid route slug;
- Storyblok's missing response in either content version;
- an unpublished story requested through the published content version;
- a story whose component is not `project`;
- a project without `page_enabled === true`.

This means all existing project records remain deliberately unroutable even when
they are published for the legacy feed.

An opted-in project with malformed required metadata, an invalid rich-text
document, unsupported media, an unknown body block, or an invalid header count
throws a focused validation error. It is a broken enabled record, not a missing
page, and should be visible during authoring and automated checks.

Delivery errors continue to omit Storyblok tokens, full request URLs, and API
response bodies.

## Verification

Implementation follows red-green-refactor cycles and covers:

1. Schema merge and tracer-plan behavior, including proof that existing project
   stories receive no writes.
2. Published and draft project delivery, token selection, AP region URL, cache
   busting, safe slug handling, response mapping, and secret redaction.
3. Missing, unpublished, wrong-component, and non-opted-in not-found behavior.
4. Strict validation for metadata, tag, header, rich-text, and media values.
5. Header, rich-text, image/video, caption, and exact body-order rendering.
6. Preview Bridge inclusion only for authenticated draft rendering.
7. A production build, the complete Vitest suite, the unchanged legacy Node test
   suite, `git diff --check`, credential scans, and comparisons proving the static
   site and GitHub Pages workflows are unchanged.
8. Live checks after applying the migration:
   - the draft tracer renders through a valid signed local preview URL;
   - the saved draft reload path remains active;
   - the published tracer returns HTTP 200;
   - an unknown slug returns 404;
   - at least one existing published project without `page_enabled` returns 404;
   - the normal and preview page markup contains no token value.

## Rollback

The schema change is additive, so rollback does not delete component fields.
Disable and unpublish only `projects/product-design-tracer`, then remove or revert
the Next.js route code. Existing project records and the current static homepage
continue to use their original fields throughout.

## Out of scope

- Migrating or modifying Aesop or any existing project
- Reading from or replacing the legacy `case_study` model
- Enabling project pages for existing records
- Adding the tracer to the current homepage
- Homepage composition or visual-parity work from #57–#59
- Two-column or embed blocks from #70
- Galleries or slideshows from #71
- Final multi-site theming or `rowan.kspf.au` routing from #73 and #45
- Cloudinary optimisation, responsive variants, or loading policy from #66, #78,
  and #79
- Deployable preview cookies, a preview toolbar, or live unsaved keystrokes
- Production cutover or changes to the static GitHub Pages deployment
