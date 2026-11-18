# Homepage slideshow equal width

## Goal

Give every homepage slideshow the same intended maximum width while preserving each project's natural media aspect ratio. Slides must resize proportionally without stretching or cropping.

## Chosen approach

Use the existing `--hero-width` value as the shared intended slideshow width. Keep the current available-space calculation so the frame shrinks when the viewport or side metadata leaves less room.

The slideshow frame will therefore use:

- a maximum width of `--hero-width` (currently `800px`);
- the available horizontal space as its responsive upper bound; and
- the detected `--hero-aspect` only to calculate height.

This removes aspect ratio from the intended-width calculation. Wider and squarer landscape assets will have equal widths when space permits, while their heights remain naturally different.

## Scope

- Update the homepage project-frame sizing in `style.css`.
- Preserve the existing metadata-clearance calculation and the mobile single-column layout.
- Increment the `style.css` cache-busting value in `index.html`.
- Do not change project content, slide order, media files, slideshow transitions, navigation, or case-study layouts.

## Verification

At desktop width, verify that AP—REPS, Jak Architecture, Albus Lumen, Aesop, and Christopher Myles Henderson all reach the same `800px` frame width when sufficient space is available.

At narrower desktop, tablet, and mobile widths, verify that frames shrink to fit without horizontal collisions, stretching, cropping, or overflow. Confirm each frame's height continues to follow its detected natural aspect ratio.
