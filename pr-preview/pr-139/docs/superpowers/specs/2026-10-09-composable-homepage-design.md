# Composable Storyblok homepage — issue #59

Status: approved by Rowan on 2026-10-09. Automatic Work feed confirmed. Implementation follows this design; CMS draft migration remains a separate review checkpoint.

## Objective

Render the existing Next.js homepage from an ordered Storyblok block body. Allow Information, Navigation and Work to be reordered without duplicating project or site-settings stories. Preserve the static production homepage until the separate production cutover.

The latest published code baseline is origin/main at 3e85b01, including the page-load fixes, flipped side labels and shared caption presets. Do not use the older baseline of the current detached checkout as the visual reference. The current checkout also contains uncommitted typography work; preserve it and exclude it from this feature.

## Approaches

1. Add an ordered body to the existing home_page component and temporarily support both content models. Recommended: preserves the Home story identity and static compatibility, with an explicit fallback only for unmigrated stories.
2. Create a second homepage component/story. This offers complete separation but creates two sources of editorial truth and requires an additional cutover of story references and preview configuration.
3. Replace the existing schema immediately. This removes the transition code sooner but would break the static production path before its approved cutover.

## Storyblok structure

Retain the existing Home story and its home_page component. Add a Page blocks/body field restricted to nestable information, navigation and project_feed components. Display project_feed as Work in the editor.

For this first migration, the body contains exactly one instance of each core block, in any order. Stable block _uid values are required and used as rendering keys. Duplicate core instances are rejected to prevent duplicate anchor IDs. Adding other block types belongs to later work; the renderer will provide a clear typed registration point for them.

- Information resolves content from the existing site_settings story by story reference. Do not copy its profile, contacts or services into a new story.
- Navigation resolves labels/links from the same site_settings story. Retain the Home intro and navigation-visibility fields as compatibility controls in #59 so they have one value shared by both renderers.
- Work resolves existing project records through the agreed feed strategy. It contains no copied project rich text or media.
- Page title, meta description and Starting section remain page-level controls. Starting section keeps the Information/Work anchor semantics regardless of block order.
- Existing caption presets and visibility controls introduced in PR #118 remain effective. Their replacement with independent field-position controls belongs to #120, not #59.

## Work feed decision

Approved: retain the automatic feed of projects marked Show on home, using their current order and tie-breaking rules. Work selects the canonical projects/ collection; the server resolves its existing project stories. New eligible projects appear without a second editorial step. Do not add an explicit project-reference list.

## Delivery and rendering

Introduce a discriminated typed union for Information, Navigation and Work blocks. The Home mapper validates body type, supported components, unique nonempty _uid values and required references. Resolve referenced content on the server using the existing published/draft version boundary and server-only credentials. Reuse resolved site and project records when multiple blocks refer to them.

Extract the existing Information, Navigation and project-feed markup into focused React components. A block renderer maps the Home body in its saved order. Work reuses the existing HomepageSlideshow and caption logic. Adjust only the wrapper/spacing rules required to compose these components, preserving their approved typography, image sizing and interaction behaviour.

Preserve #information and #work anchors, navigation visibility, focus targets, starting-section scroll and the draft preview bridge. A hidden Navigation block must not leave a blank region. Reordering must change actual DOM order, rather than only visual CSS order. Verify the first-project loading priority remains attached to the first rendered project.

For an unmigrated Home story with no body property, construct the existing Information → Navigation → Work sequence in the resolver. An explicitly supplied empty or invalid body is an error, not an excuse to silently restore the old layout. Missing references, wrong story types and unsupported block types report clear content errors without exposing credentials.

## Migration and compatibility

Provide a plan-first migration command using the established Storyblok management pattern. Its default mode reads the current schema and Home story, reports intended changes and performs no writes.

The apply step adds the three compatible nestable components and the Home body field without removing or rewriting legacy fields. It saves the current Home story as a draft with stable block UIDs and the existing content references in the baseline order. It preserves all unrelated Home values, existing caption controls, translations and all project/site-settings content.

Back up the exact pre-migration Home content and relevant schema definitions locally before writes. Re-read fresh content before apply and reject conflicting changes instead of overwriting them. Re-running apply on an already equivalent composition is a no-op; a different existing composition is preserved and reported for review. No automatic publication, story deletion or project duplication.

Review the migrated draft in the Next.js Visual Editor before any publication. The static pipeline continues to consume its legacy fields and generated JSON and ignores the new body. Publishing the Home body would therefore change the Next homepage composition only; it would not reorder the static homepage. This transition limitation must be documented clearly.

Rollback restores the saved Home draft content without deleting shared components or unrelated stories. Removal of the compatibility fields and fallback belongs to the later production-cutover cleanup.

## Validation

- Schema tests verify block whitelist, field types, references and legacy-field preservation.
- Mapper/resolver tests cover legacy fallback, all core-block permutations, invalid/empty body, duplicate UIDs/core blocks, reference resolution and wrong/missing stories.
- Published/draft tests prove matching version selection and unchanged secret boundaries; Next does not rely on the generated-JSON path.
- Migration tests verify dry-run zero writes, preservation of unrelated content, backups, conflict rejection and idempotent apply.
- Component tests prove actual DOM order, anchor/focus targets, hidden navigation and the existing slideshow/caption semantics.
- Build and existing Node/Vitest checks pass against the implementation baseline.
- Internal-browser comparisons cover the migrated baseline and reordered blocks at desktop, tablet and mobile widths, including the 858px and 1280px boundaries. Check long captions, empty values, overflow, image/video navigation, keyboard focus, reduced motion and initial page load.
- Verify saved draft reorder changes in the Next.js Visual Editor. Identify that preview as Next.js; localhost:8001 remains the static saved-draft preview and does not implement the new block composition in #59.
- Check the legacy static generation and preview remain compatible with the migrated Home data.

## Out of scope

Independent caption-position dropdowns (#120), new content block types, Experience components, individual project-page redesign, multi-site routing, media-provider changes, typography work already in progress, and production deployment/cutover.

## Review checkpoints

Confirm the Work feed strategy and approve this design before implementation. Then write the implementation plan, build and verify locally, prepare the migration plan for review, and apply only the agreed draft migration. Publication and a new PR require their appropriate session authorization.
