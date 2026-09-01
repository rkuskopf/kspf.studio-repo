# Storyblok setup

This repo keeps its existing static HTML, CSS, JavaScript, and GitHub Pages hosting. Storyblok supplies structured content during deployment, and `scripts/sync-storyblok.mjs` converts that content into the JSON files the site already renders.

Published Storyblok stories are the production content source of truth. The checked-in JSON is only a local/offline fallback and can be older than Storyblok. The existing Decap `/admin` surface is intentionally retained during the cutover and can be removed after Storyblok content has been verified in production.

## 1. Create the Storyblok space

Create a space in Storyblok and note its numeric space ID and region. For an Australia-hosted space, use `ap`.

Create a personal access token in your Storyblok account with access to the target space. Keep this management token local; never commit it or place it in frontend code.

Copy `.env.example` to `.env`, then fill in:

- `STORYBLOK_SPACE_ID`
- `STORYBLOK_REGION`
- `STORYBLOK_MANAGEMENT_TOKEN`

Preview the import plan:

```sh
node --env-file=.env scripts/setup-storyblok.mjs
```

Create the component library and import the repo's current content as draft stories:

```sh
node --env-file=.env scripts/setup-storyblok.mjs --apply
```

The importer is additive: it creates missing KSPF components and stories and leaves matching remote content untouched. Imported media initially keeps its current repo URL. Editors can replace any slide with an asset from Storyblok without changing the site code.

If this is a new, dedicated space with a generated starter `home` story, either delete that starter first or explicitly replace the expected KSPF story slugs:

```sh
node --env-file=.env scripts/setup-storyblok.mjs --apply --replace-existing
```

`--replace-existing` overwrites the draft content at the KSPF story slugs, so do not use it in a shared or already populated space.

Review and publish these stories in Storyblok:

- `site`
- `home`
- `experience`
- every story in `projects/`
- every story in `case-studies/`

## 2. Connect GitHub Pages

In the Storyblok space, create a **Public** Content Delivery API token. Public tokens can read published content only and are the correct token type for production frontends.

In the GitHub repository settings, add:

- Actions secret `STORYBLOK_PUBLIC_TOKEN`
- Actions variable `STORYBLOK_REGION` with `ap`, `eu`, `us`, `ca`, or `cn`

Run the **Deploy Production Site** workflow once. It will:

1. fetch one published Storyblok snapshot;
2. generate the site's JSON files and pre-render both Home and Site navigation content into the initial HTML;
3. stamp HTML, CSS, JavaScript, and CMS requests with one deterministic deployment revision;
4. push the generated artifact to `gh-pages`;
5. explicitly request the legacy GitHub Pages build when the branch changed;
6. wait for Pages to build that exact `gh-pages` commit; and
7. verify that `https://kspf.au/deployment.json` reports the exact generated deployment revision, including both the expected `main` source revision and the Storyblok content hash.

The workflow also runs every 15 minutes, so published Storyblok changes reach the site without a code commit. Scheduled GitHub Actions can start late; when a Storyblok publish must go live immediately, dispatch the same production workflow from GitHub or run:

```sh
gh workflow run deploy.yml --ref main
```

The workflow fails before deployment if the public Storyblok token is missing or published content cannot be fetched; production never falls back to the checked-in JSON snapshot. It also fails if Pages builds the wrong revision, the custom domain changes, HTTP does not redirect to the HTTPS site, HTTPS cannot serve the manifest, or the live manifest remains stale. A safe recovery is to rerun the failed workflow; the generated revision is deterministic, so retrying the same source and Storyblok snapshot does not create a different artifact. Do not edit `gh-pages` by hand.

Each successful Pages build replaces and invalidates the HTML document, which contains the deployment revision in a `kspf-deployment-revision` meta tag. Local CSS and JavaScript asset URLs, plus browser requests for generated Storyblok JSON, carry that same revision as a query parameter. The live smoke check fetches `deployment.json` without using the browser cache and compares both the source and content parts of the revision, so a Storyblok-only update cannot be mistaken for the previous release.

## 3. Work locally

Add the public and preview delivery tokens to your untracked `.env` file.

Pull published content:

```sh
node --env-file=.env scripts/sync-storyblok.mjs --version published
```

This command writes the published Storyblok snapshot into the local JSON files. Use it before reviewing the plain static server, and do not treat an older checked-in fallback value as newer than Storyblok.

Pull draft content for local review:

```sh
node --env-file=.env scripts/sync-storyblok.mjs --version draft
```

Then serve the repo as usual:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

The local preview is `http://localhost:8000/`.

## 4. Create and preview the project-page tracer

The project-page migration is deliberately separate from the existing broad
setup/import flow. It reads only the repository-root management environment:

- `STORYBLOK_SPACE_ID`
- `STORYBLOK_MANAGEMENT_TOKEN`
- `STORYBLOK_REGION`

Keep those values in the untracked root `.env` file, export them into the shell
that runs the migration, and never place the management credential under
`next-app/`. The Next.js delivery environment is separate: its
`next-app/.env.local` contains only `STORYBLOK_PUBLIC_TOKEN`,
`STORYBLOK_PREVIEW_TOKEN`, and `STORYBLOK_REGION`.

From the repository root, use the migration as three explicit stages:

```sh
npm run storyblok:project-page
npm run storyblok:project-page -- --apply
npm run dev
npm run storyblok:project-page -- --publish
```

The first command is a dry run: it plans any missing block components, the
additive `project` schema update, and the one draft tracer without writing.
After reviewing that plan, `--apply` creates only
`projects/product-design-tracer` and never updates an existing project story.
It does not publish. Keep the management variables out of the Next.js process
when starting `npm run dev`.

For the tracer or another direct project page, set **Settings -> Visual Editor**
to `https://localhost:3000/` while `npm run dev` is running. In the tracer
story's **Config**, set its Real path to
`/projects/product-design-tracer`. The resulting Visual Editor iframe is
`https://localhost:3000/projects/product-design-tracer` with Storyblok's signed
query parameters, which permit a saved local draft. Unsigned local requests
stay on published delivery. Before publishing the new tracer, its unsigned route
is therefore a 404. Unknown slugs and existing projects without
`page_enabled === true` are also deliberate 404s.

Publish is a separate, final step. Run `--publish` only after reviewing the
draft route; it publishes the exact verified tracer and no other story. After a
problem, leave the additive schema in place, disable and unpublish only the
tracer, and revert the Next route if necessary. This preserves all existing
project records and the static homepage.

This slice only renders the supplied project-page image or video. Cloudinary
references, transforms, responsive variants, dimensions, and loading policy are
owned by #82 and are not configured by this migration.

## 5. Preview legacy static-site drafts inside Storyblok

This is the legacy static-site preview only. It reads saved draft content into
memory, keeps the preview token on the Node server, and does not change
`projects.json` or any tracked `content/*.json` file. It does not preview the
#72 tracer or any direct Next.js project page; use the Next.js Visual Editor
configuration in section 4 for those routes.

Start the secure preview server:

```sh
node --env-file=.env scripts/preview-storyblok.mjs
```

The first run creates an ignored self-signed certificate in `.storyblok-preview/`. Open [https://localhost:8001/](https://localhost:8001/) in Chrome and accept the certificate warning once.

Then configure Storyblok:

1. Open the KSPF space.
2. Go to **Settings -> Visual Editor**.
3. Set the default Preview URL to `https://localhost:8001/` only when reviewing
   legacy static-site stories. Switch it back to `https://localhost:3000/` for
   the tracer/direct project-page workflow in section 4.
4. Open a story and switch from **Form** to **Visual** if the preview is hidden.

Legacy story routes are handled automatically: `home`, `site`, and legacy
homepage-feed `projects/*` preview on the homepage; `experience` previews on
the experience page; and the Aesop case-study story previews on its case-study
page. This mapping explicitly excludes `projects/product-design-tracer` and the
Next.js project-page route.

To review a change without publishing it:

1. Edit the story and select **Save**.
2. The preview refreshes with the saved draft.
3. Check Storyblok's Desktop, Mobile, or Full-width preview.
4. Select **Publish** only when the change is ready for the public website.

Keep the terminal command running while using the Visual Editor. Stop it with `Control-C` when finished. This integration refreshes after Save or Publish; it does not render unsaved keystrokes in real time.

## Content model

The source-controlled schema lives in `scripts/storyblok-schema.mjs` and maps to the current site as follows:

| Storyblok story | Generated site file |
| --- | --- |
| `site` | `content/site.json` |
| `home` | `content/home.json` |
| `experience` | `content/experience.json` |
| `projects/*` | `projects.json` |
| `case-studies/*` | `content/case-studies/<slug>.json` |

The production sync uses Storyblok's read-only [Content Delivery API](https://www.storyblok.com/docs/api/content-delivery/v2). The one-time importer uses the [Management API](https://www.storyblok.com/docs/api/management), and its token should stay in local environment variables. Storyblok's token roles are documented in [Access Tokens](https://www.storyblok.com/docs/concepts/access-tokens).

## Visual Editor boundary

The local preview provides secure save-to-refresh draft review while retaining a fully static GitHub Pages deployment. The Storyblok Bridge is injected only by the local HTTPS server. The preview token is never added to the public production site.
