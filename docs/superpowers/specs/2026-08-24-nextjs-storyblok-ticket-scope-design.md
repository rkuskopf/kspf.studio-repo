# Next.js and Storyblok ticket scope design

## Objective

Turn GitHub issues #56–#66 into a roadmap that can be worked without re-interpreting the migration each time. Keep #67 as the overall rebuild, make the current static deployment reliable until cutover, establish the Storyblok–Cloudinary–Next.js media boundary, and make every executable ticket demoable or verifiable on its own.

## Current state

- The repository is a static HTML/CSS/JavaScript site with a Storyblok-to-JSON compatibility pipeline and GitHub Pages deployment.
- There is no Next.js application or `package.json` yet.
- The production workflow pushes a generated commit to `gh-pages`, but it does not trigger and verify the corresponding Pages deployment or prove that the live site serves that revision.
- The repository has no Cloudinary configuration or documented media-provider boundary; portfolio video can therefore remain ambiguous between Storyblok, GitHub, and a delivery provider.
- The existing Storyblok schema, delivery, preview, tests, and documentation still depend on the Experience story.
- The current homepage uses vertical scroll snapping, JavaScript-rendered project slideshows, and fixed previous/next hit areas.
- #56–#66 are native sub-issues of #67 and have native blocker relationships, but #57, #62, #63, #65, and #66 still combine several independently deliverable outcomes.

## Constraints

- The live static site remains intact and reliably deployable until the replacement is validated.
- The framework migration is not a redesign. The current homepage is the parity baseline.
- The reverted horizontal rail is not revived. Scroll work must preserve a normal vertical document and must test slideshow controls.
- Experience is removed, not migrated.
- Media performance is a release requirement and blocks production cutover.
- Storyblok owns content, editorial media metadata, and stable Cloudinary references; Cloudinary owns and delivers the primarily video/media asset library; Next.js is the frontend.
- Cloudinary configuration and one real video tracer must be complete before the downstream portfolio image and video slices implement the provider boundary.
- `/crm` remains outside the public portfolio migration.
- Follow-on layout, project-page, and multi-site capabilities do not block the first production cutover unless their work is explicitly pulled into it.

## Approaches considered

### 1. Rewrite the existing eleven issues only

This keeps the tracker small, but leaves several tickets too large for a focused work session or an autonomous agent. It does not solve the main readiness problem.

### 2. Keep roadmap workstreams and add executable nested slices

This preserves #56–#66 as the agreed roadmap, adds sub-issues only where a workstream is too broad, and retains native dependencies. It also lets progress roll up cleanly to #67. This is the selected approach.

### 3. Replace #56–#66 with a new flat ticket set

This could create uniform issue sizes, but it would duplicate or invalidate the links already shared in GitHub and Linear. The migration cost is not justified.

## Ticket architecture

### Directly executable roadmap tickets

- #56: scaffold the isolated Next.js foundation.
- #58: connect one complete published-and-draft Storyblok content path to Next.js.
- #59: replace the fixed homepage model and render the current homepage from ordered blocks.
- #60: implement the vertical Information → Navigation → Portfolio document flow.
- #61: add the one-column/three-column feed variant without duplicating content.
- #64: remove the Experience surface across the live site, Storyblok pipeline, preview, tests, and docs.
- #81: make the current GitHub Pages deployment and cache invalidation reliable while the replacement is built.

Each of these receives the standard `Parent`, `What to build`, `Acceptance criteria`, and `Blocked by` structure.

### #57 — homepage parity workstream

1. **Port the homepage shell and first project to Next.js at visual parity**
   - Blocked by #56.
   - Covers the document shell, navigation, information section, one real project, one functioning slideshow, styling, keyboard controls, and desktop/mobile verification.
2. **Complete the Next.js homepage feed and parity checks**
   - Blocked by the first parity slice.
   - Covers every remaining project, footer/content completion, responsive regression checks, reduced motion, and the final side-by-side parity record.

### #62 — flexible project-page workstream

1. **Ship a Storyblok project page with header, text, and media blocks**
   - Blocked by #58 and #59.
   - Proves dynamic routing, the project model, and one migrated project end-to-end.
2. **Add gallery and slideshow blocks to Storyblok project pages**
   - Blocked by the core project-page slice.
   - Adds interactive media to the migrated project with keyboard, mobile, and reduced-motion checks.
3. **Add two-column and embed blocks to Storyblok project pages**
   - Blocked by the core project-page slice.
   - Adds the remaining layout capabilities to a real project and verifies responsive fallback behavior.

### #63 — multi-site workstream

1. **Resolve Storyblok site configuration by hostname**
   - Blocked by #59 and #62.
   - Proves two site identities locally from the same code and content base.
2. **Launch rowan.kspf.au from the shared portfolio platform**
   - Reuses existing issue #45 instead of creating a duplicate.
   - Blocked by hostname resolution and the production deployment established by #65.

### #65 — production cutover workstream

1. **Deploy the Next.js and Storyblok build to a production-like preview**
   - Blocked by #57, #58, #59, #64, and #66.
   - Proves a clean build, CMS delivery, preview, redirects, and domain configuration without affecting `kspf.au`.
2. **Switch kspf.au to the validated Next.js deployment**
   - Blocked by the production-like preview.
   - Performs the reversible domain cutover and validates the live site.
3. **Remove the legacy static deployment and CMS compatibility code**
   - Blocked by the live cutover.
   - Removes GitHub Pages/static generation, Decap, generated JSON plumbing, obsolete root assets, and updates documentation only after reference checks.

The eventual cleanup in #65 does not replace #81: the legacy production path must work reliably for the duration of the migration.

### #66 — media performance workstream

1. **Configure Cloudinary and deliver one portfolio video end-to-end**
   - Blocked by #56 and #58.
   - Establishes credentials/configuration, asset conventions, Storyblok reference fields, Next.js delivery resolution, and one real published-and-draft video tracer.
2. **Serve responsive portfolio images through the Storyblok–Cloudinary boundary**
   - Blocked by #57 and the Cloudinary foundation slice.
   - Delivers correct dimensions, Cloudinary responsive variants, first-viewport priority, and off-screen lazy loading from Storyblok metadata and stable asset references.
3. **Gate Cloudinary portfolio video loading by viewport and intent**
   - Blocked by #57 and the Cloudinary foundation slice.
   - Delivers Cloudinary posters and web variants, viewport-gated sources, no GitHub or Storyblok production-video origin, and accessible playback.
4. **Enforce desktop and mobile media performance budgets before cutover**
   - Blocked by the image slice, video slice, and #59.
   - Adds repeatable checks that fail visibly when the initial page requests all media, bypasses the agreed Cloudinary transformations, or exceeds the agreed budgets.

## Tracker conventions

- #67 and roadmap workstreams with nested slices use the `epic` label.
- Executable tickets use the `dev` and `kspf.au` labels.
- All roadmap and executable tickets use the `Portfolio` milestone.
- Dependencies are native GitHub blocker relationships and are repeated in the issue body for readers and downstream syncs.
- Parent workstreams close only after all native sub-issues are complete.

## Verification

- Query GitHub after publishing and confirm every executable ticket has the intended parent and blocker set.
- Confirm #67 has #56–#66 plus #81 as its twelve direct sub-issues.
- Confirm #66 has #82 first, followed by #78, #79, and #77, with downstream blockers pointing through the Cloudinary foundation.
- Confirm #45 is nested under #63 and no duplicate second-site ticket was created.
- Confirm labels and the Portfolio milestone match the tracker conventions.
- Confirm the repository remains unchanged except for this scope document and the implementation plan.
