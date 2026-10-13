# Shared Work caption positions — issue #120

Status: approved by Rowan on 2026-10-09 and implemented locally. On Rowan's instruction, the four additive Work fields and equivalent Home draft positions were saved through the signed-in internal browser after the management API returned HTTP 401. Saved draft delivery is verified. No publication or commit has occurred.

## Target and scope

Implement on the Next.js homepage's existing `project_feed` block, displayed as Work in Storyblok. Issue #59 landed in PR #123; the baseline is main at d7b2a84. Keep project content and the individual slideshow-counter toggle on project stories. Individual project pages and the static production renderer remain outside this change.

## Approach

Recommended: render four caption slots around each slideshow, with shared placement settings resolved from Work. Slots provide normal-flow stacking and keep placement independent of project content.

Alternative: independently position each label with absolute CSS coordinates. This requires measuring collisions and makes long text and mobile stacking fragile.

Alternative: expand the current page-level caption presets. This cannot express all independent field combinations and would retain placement ownership on Home rather than Work.

## Editor controls and defaults

Add four option fields to `project_feed`: `title_position`, `category_position`, `caption_position`, and `number_position`. Display them as Project title position, Category position, Image caption / slideshow counter position, and Project number position. Each offers Left (`left`), Right (`right`), Bottom left (`bottom-left`), Bottom right (`bottom-right`), and Hidden (`hidden`). Rowan requested Hidden for all four controls after reviewing the implementation. Hidden removes the field on desktop and mobile, including caption/counter content, without an empty slot.

Absent or invalid position values resolve independently to these defaults:

| Field | Default |
| --- | --- |
| Project number | Left |
| Project title | Bottom left |
| Category | Right |
| Image caption / slideshow counter | Bottom right |

Project stories receive no placement fields. Existing Home visibility controls continue to apply. The new Work settings replace page-level layout presets for composed Next.js feeds; legacy static layout controls remain available for static compatibility.

## Layout and stacking

Side slots sit beside the slideshow frame, aligned to its top. Bottom slots align with the frame's left and right edges underneath. Preserve the existing frame sizing, responsive portrait handling, and project spacing.

Within every slot, use this order: project number, project title, category, image caption/counter. Stack visible fields with a consistent 10px gap. Right slots align text right. Empty or hidden fields contribute no element or gap. Long labels wrap within their slot; captions grow in normal flow so adjacent projects cannot overlap.

At the existing mobile caption boundary (below 858px), map Left to Bottom left and Right to Bottom right. Apply the same field order after combining slots. No mobile editor controls. Keep image-relative bottom alignment and constrain long links/text to prevent horizontal overflow. Mobile columns stack independently so long content in one column cannot enlarge the other column's inter-field gaps. CSS exposes separate desktop/mobile variants, using the same slideshow state and one unique title ID outside those variants.

## Rendering and interactions

Pass typed Work positions through the block renderer to the slideshow caption renderer, including the adjacent Navigation → Work path. Keep the live counter within the slideshow's state owner; changing slide updates it wherever its slot is placed. Preserve grey current number, 10px counter gap, three-digit formatting, and its accessible slide description.

Retain ProjectLabel rendering for rich-text links and line breaks, stable title IDs, and existing visibility behavior. Caption links remain outside arrow targets. Preserve pointer, touch, keyboard, reduced-motion, image/video, and first-slide loading behavior.

Unmigrated Home stories retain the existing legacy rendering and page-level presets until they have a composed body. New or missing positions on a composed Work block use the defaults above.

## CMS transition

Provide a plan-first, additive schema/draft migration using the existing management API conventions. Add fields to the existing Work component, preserve unrelated component fields and Home content, and never publish. Back up the exact affected schema and Home draft before applying, reject intervening changes, and make reruns idempotent.

For an existing composed Work block with no explicit positions, translate the current Home preset into explicit equivalent positions during migration, preserving an intentional saved layout. Existing explicit Work settings win. The `current` preset maps to the defaults above; other preset mappings must match the current renderer. Do not mutate project stories or static compatibility fields. Update the existing composition migration's schema compatibility checks so these additive fields do not break reruns.

Prepare and inspect the migration plan before requesting approval to apply CMS changes. Schema/draft writes and publication are separate from local implementation review.

## Verification

Test schema options/defaults and absence of project-level overrides; mapper defaults and malformed values; migration backups, preservation, conflict rejection and idempotence; shared rendering across multiple projects and both block-rendering paths; all position combinations and mobile mapping/stack order; empty fields and rich-text links; and live counter updates through keyboard/touch navigation.

Run the repository Node tests, Vitest, type checks and Next.js production build. Use only the Codex internal browser for desktop/mobile visual checks, including widths around 858px, long text, all fields sharing a slot, hidden values, counters, image/video navigation and link focus.

Use the Next.js development server for this feature. Verify delivery of saved Storyblok draft positions in the Next.js preview before providing a review link. The static preview on port 8001 does not implement these Work positions.
