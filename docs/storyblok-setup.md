# Storyblok setup

This repo keeps its existing static HTML, CSS, JavaScript, and GitHub Pages hosting. Storyblok supplies structured content during deployment, and `scripts/sync-storyblok.mjs` converts that content into the JSON files the site already renders.

The checked-in JSON remains a working fallback until Storyblok is connected. The existing Decap `/admin` surface is intentionally retained during the cutover and can be removed after Storyblok content has been verified in production.

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

Run the **Deploy Production Site** workflow once. It will validate the Storyblok response, generate the site's existing JSON files, pre-render the home metadata and intro, and deploy to the existing `gh-pages` branch.

The workflow also runs every 15 minutes, so published Storyblok changes reach the site without a code commit. GitHub Pages does not provide an anonymous build-hook URL; if instant publish is needed later, add a small authenticated webhook receiver that dispatches this same workflow.

## 3. Work locally

Add the public and preview delivery tokens to your untracked `.env` file.

Pull published content:

```sh
node --env-file=.env scripts/sync-storyblok.mjs --version published
```

Pull draft content for local review:

```sh
node --env-file=.env scripts/sync-storyblok.mjs --version draft
```

Then serve the repo as usual:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

The local preview is `http://localhost:8000/`.

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

This first integration provides Storyblok's structured editing and asset library while retaining a fully static GitHub Pages deployment. Storyblok's live Visual Editor requires a separate HTTPS preview runtime that fetches draft content and loads the Storyblok Bridge. Do not put the preview token into the public production site. Add that preview environment only if live in-context editing is required.
