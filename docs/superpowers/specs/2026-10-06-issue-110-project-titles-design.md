# Issue #110: project titles and desktop numbers

Status: approved and implemented locally; CMS schema/content application remains pending review.

## Scope and behaviour

Update the static homepage and the Next.js homepage together, following the parity established by the recent row-height change. Project-page routes are outside this change.

Place each project title below the stable slideshow container at every viewport size. Align its left edge to the left edge of the centred portrait-image position. This is a stable horizontal anchor: when a landscape slide appears, the title stays at that portrait alignment rather than following the landscape image's wider left edge. Use the same anchor for projects containing only landscape media. Recalculate the anchor when the viewport changes, using the responsive portrait width constrained by the space between desktop side labels. Use a 20px gap below the slideshow container. The title stays at the same vertical position within its project as slides change orientation. Constrain title width to the project's available portrait width and allow long titles to wrap.

On desktop (above the existing 700px mobile breakpoint), replace the left-side title with the project's number, retaining the existing side-label typography and vertical alignment. Keep the category on the right. Each project owns its number, so scrolling to another project exposes that project's number. Changing slides within a project does not change the number. Mobile shows the title below the media and hides the separate number.

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

## Responsive review follow-up

Portraits and captions now share a per-project width: the smaller of the responsive portrait width and the media track available between symmetric side-label reserves. Both homepages measure number/category widths so portrait and landscape media respect the same desktop collision constraint. Keep at least 20px between media and side labels.

Static mobile portrait-only containers use the portrait frame height directly. Mixed-orientation containers reserve the larger of portrait height and landscape height across the project, so title placement remains stable during slide changes. A portrait-only image therefore has a 20px title gap at both 660×1200 and 550×1200; the landscape/image-to-caption gap can be larger inside a shared mixed-orientation container.

Updated static asset revisions ensure previews load the current layout and renderer after switching checkouts. Verify the preview server's working directory when reusing port 8001; a separate checkout can contain different uncommitted styles.
