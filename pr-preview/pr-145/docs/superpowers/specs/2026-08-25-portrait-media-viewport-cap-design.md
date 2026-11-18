# Portrait media viewport cap

## Goal

Keep portrait homepage slideshow media fully inside the visible viewport without cropping it or changing the established landscape slideshow sizing.

## Current problem

Homepage media is constrained by width but not height. The published Jak Architecture portrait video therefore renders at `720 × 960` in a `1440 × 900` browser viewport and extends beyond both the top and bottom of the screen.

The slideshow already detects the active slide's aspect ratio and applies `is-portrait` to its `.hero` element. The fix can use that existing state without changing content data.

## Design

Add a portrait-only CSS constraint to the current static homepage:

- cap active portrait images and videos at `min(75dvh, 590px)`;
- include `min(75vh, 590px)` immediately before it as the fallback for browsers without dynamic viewport units;
- preserve natural aspect ratio with automatic width and height;
- use `object-fit: contain` so media is never cropped; and
- keep the media centred in its existing slideshow frame.

Landscape slides retain the current shared-width behaviour. Mobile portrait media may become width-limited before reaching the height cap, which is expected.

## Content and architecture boundary

This fix does not add or change Storyblok fields, rewrite slide data, or migrate assets. Optional per-slide editorial sizing belongs in the structured media work under #78 after the Next.js and Cloudinary boundary is established.

## Verification

- Add a focused regression check for the portrait-only viewport cap and fallback.
- At `1440 × 900`, confirm the published Jak Architecture portrait video is no taller than `590px`, remains centred, and is not cropped.
- At a representative mobile viewport, confirm the video remains within the visible page width and height.
- Confirm representative landscape slides keep their current dimensions.
- Confirm slideshow navigation, vertical snap scrolling, and console output do not regress.

## Out of scope

- Storyblok size controls or schema changes
- Cloudinary transformation or delivery changes
- Next.js implementation
- Changes to project order, media files, navigation, or landscape sizing
