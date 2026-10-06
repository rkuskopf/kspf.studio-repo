# Issue #110: project titles and desktop numbers

Status: approved and implemented locally; CMS schema/content application remains pending review.

## Scope and behaviour

Update the static homepage and the Next.js homepage together, following the parity established by the recent row-height change. Project-page routes are outside this change.

Place each project title below the stable slideshow container at every viewport size. Align its left edge to the left edge of the centred portrait-image position. This is a stable horizontal anchor: when a landscape slide appears, the title stays at that portrait alignment rather than following the landscape image's wider left edge. Use the same anchor for projects containing only landscape media. Recalculate the anchor when the viewport changes, using the existing responsive portrait width. The mobile layout applies at widths up to and including 857px; desktop side labels begin at 858px. Use a 20px gap below the slideshow container. The title stays at the same vertical position within its project as slides change orientation. Constrain title width to the portrait width and allow long titles to wrap.

On desktop (above the 857px mobile breakpoint), replace the left-side title with the project's number, retaining the existing side-label typography and vertical alignment. Keep the category on the right. Each project owns its number, so scrolling to another project exposes that project's number. Changing slides within a project does not change the number. Mobile shows the title below the media and hides the separate number.

Preserve portrait sizing/crops, slideshow interaction, and free scrolling. Contain landscape media inside the reserved slideshow track, including short desktop windows, so it cannot overlap the title. Reserve enough space for the caption so it cannot overlap the next project, including wrapped titles.

## Data

Add optional Storyblok `project_number` text and JSON `projectNumber` fields. Text preserves editorial values such as `01`. Pass the value through the static content mapper and Next.js homepage delivery type. Update schema definitions, seed support, and the local editor configuration where applicable.

For an absent or blank field, display the project's one-based position in the visible, sorted homepage feed padded to at least two digits. An explicit value stays attached to the project when the feed is reordered. This fallback allows existing published content to render without requiring immediate CMS edits.

Prepare and verify local schema changes. Applying changes to the remote Storyblok space and publishing content are separate review steps.

## Approach

Recommended: keep the existing media sizing rules and use the responsive portrait-width value to size and horizontally centre the caption area in both homepages. Its left edge therefore matches the portrait-image position regardless of the current slide's orientation. Caption horizontal positioning must not depend on the active media's measured width. Keep the caption in a separate flow row below the stable slideshow track. Do not measure the active media bottom or shift the caption when the slide changes. On mobile, the Next.js slideshow reserves the shared portrait-frame height and contains landscape media within that frame. Reserve the caption's full wrapped height in document flow. Keep the title present in server-rendered Next.js markup and preserve the section's accessible title association.

Alternative: measure portrait bounds to position the caption. This adds load and resize coordination without improving on the existing portrait-width value. Sizing the caption to the active slide would make it shift horizontally between portrait and landscape slides and does not match the intended treatment.

## Verification

- Test field mapping, explicit numbers, blank-field fallback, hidden-project filtering, and feed ordering.
- Check portrait and landscape images and videos, slide transitions, and resize at mobile, larger mobile, and desktop sizes.
- Measure title alignment against the centred portrait-image position. Confirm its horizontal and vertical position within the project stays unchanged when switching between portrait and landscape slides, including landscape-only projects; check long-title wrapping and separation between project rows.
- Verify side-number/category layout, keyboard slideshow controls, touch interaction, and free scrolling.
- Run the relevant existing tests and Next.js production build. Commit and open a PR after verification, as requested.

## Final breakpoint decision

The user requested reverting the follow-up that shrank portraits to fit desktop metadata and resized static portrait-only containers. Those changes are reverted. Preserve the existing portrait sizing and stable slideshow container, and switch the homepage layout and desktop scroll smoothing to mobile behaviour at widths up to 857px. Side numbers and categories appear from 858px.

## Mobile gap correction

Keep the 857px breakpoint and original portrait sizes. Restore only the static mobile container-height correction: portrait-only slideshows use the portrait frame height, while mixed slideshows use the larger required portrait/landscape height across all slides. The container does not follow the current slide. This removes width-dependent empty space below portrait-only media without bringing back desktop portrait shrinking.
