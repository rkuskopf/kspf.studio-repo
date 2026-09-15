# Storyblok local visual preview

## Goal

Give Rowan a safe way to preview saved Storyblok drafts in the Storyblok Visual Editor before publishing them, while preserving the existing static site and GitHub Pages production deployment.

The preview must never write draft content into the tracked `content/*.json` files or `projects.json`, and the preview token must never be sent to the browser or committed to Git.

## Chosen approach

Add a local-only HTTPS preview server implemented with Node's built-in modules. It will reuse the existing Storyblok mapping functions and the site's current HTML, CSS, and JavaScript rather than introducing a framework or a separate rendering implementation.

The server will:

1. Read `STORYBLOK_PREVIEW_TOKEN`, `STORYBLOK_REGION`, and `STORYBLOK_SPACE_ID` from the existing untracked `.env` file.
2. Fetch `version=draft` stories from Storyblok's EU Content Delivery API.
3. Convert those stories with `buildContentFiles` from `scripts/storyblok-content.mjs`.
4. Keep the generated JSON in memory and serve it at the existing paths, including `/projects.json` and `/content/site.json`.
5. Serve the existing repository files without modifying them.
6. Inject the Storyblok Bridge only into preview HTML responses so Save and Publish events refresh the embedded page.

Production files and the production GitHub Actions workflow will remain unchanged.

## Editor workflow

The normal editing loop will be:

1. Run one preview command from the repository.
2. Open the secure localhost URL once and accept the local certificate if the browser asks.
3. Configure that URL under Storyblok Settings -> Visual Editor.
4. Open a story, edit it, and select Save.
5. The embedded preview reloads with the saved draft while the public site continues to show the last published version.
6. Select Publish only when the draft is ready for production.

The preview is intentionally save-to-refresh. Real-time rendering of every unsaved keystroke and click-to-edit block outlines are outside this first version because the current static renderers discard Storyblok block metadata and do not expose incremental render functions.

## Routes

Storyblok builds preview URLs from story slugs, while this site uses a small number of static HTML documents. The preview server will provide these local aliases:

| Storyblok story | Preview document |
| --- | --- |
| `home` | `/index.html` |
| `site` | `/index.html` |
| `projects/*` | `/index.html` |
| `experience` | `/experience.html` |
| `case-studies/case-study-aesop` | `/case-study-aesop.html` |

Unknown routes return `404`. Static paths are resolved inside the repository root and reject path traversal.

## HTTPS and local files

Storyblok requires HTTPS for previews, including localhost. The preview command will use a certificate and private key stored in an ignored `.storyblok-preview/` directory. If they do not exist, it will generate a self-signed localhost certificate with the macOS `openssl` binary already available on this machine.

The server will listen on `127.0.0.1` only. The default URL will be `https://localhost:8001/`, leaving the existing HTTP server on port 8000 untouched.

## Draft fetching and failures

The first request will fetch all required Storyblok stories. A short in-memory cache will prevent the page's several JSON requests from repeating the same API work. Bridge-driven reloads will bypass the old cached result so a saved draft appears immediately.

Startup will fail with a clear message when the preview token is missing, the region is unsupported, the certificate cannot be created, or the port is unavailable. If Storyblok returns invalid or incomplete content, the server will retain the last valid in-memory snapshot and report the failed refresh rather than writing partial data anywhere.

The server will not log tokens or signed Storyblok query parameters.

## Files

Expected implementation changes:

- Add `scripts/storyblok-delivery.mjs` for reusable Storyblok fetching and mapping.
- Refactor `scripts/sync-storyblok.mjs` to call that shared module without changing its command-line behavior.
- Add `scripts/preview-storyblok.mjs` for HTTPS static serving, in-memory draft JSON, route aliases, and Bridge injection.
- Add `scripts/storyblok-preview-client.js` for Bridge save/publish refresh handling.
- Add focused Node tests under `scripts/tests/`.
- Ignore `.storyblok-preview/`.
- Update `docs/storyblok-setup.md` with the exact preview and Storyblok configuration steps.

## Test strategy

Implementation will follow red-green testing. Automated tests will cover:

- draft delivery uses the preview token and EU API host;
- mapped draft content stays in memory and does not write tracked JSON;
- route aliases return the correct HTML document;
- path traversal is rejected;
- HTML injection adds the Bridge only in preview responses;
- a failed refresh preserves the last valid snapshot;
- missing configuration produces actionable errors.

Final verification will run the existing Storyblok verification script, the new preview tests, `git diff --check`, a real draft API fetch, and browser checks of the HTTPS homepage plus a Storyblok-style project route. Browser console errors and failed network requests will be treated as failures.

## Non-goals

- No draft content will be deployed to GitHub Pages.
- No preview token will be added to frontend JavaScript.
- No production publish or deployment behavior will change.
- No migration to React, Vue, Astro, or another framework.
- No automatic publishing from Storyblok.
