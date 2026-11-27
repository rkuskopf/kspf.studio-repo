# Project caption positions and slideshow counter

Approved in conversation: keep Category in its prior position, move the new entry into the below-image right slot, and use a per-project counter toggle.

- Project title: rich text below the portrait track, aligned left.
- Category: rich text beside the image on desktop; below the image aligned right on mobile.
- New entry: optional independent rich text below the image aligned right, level with the title. On mobile Category and this entry stack in the right column.
- Show slideshow counter: optional boolean, default false. Replaces the new entry text with current slide and total, including video slides. Current is grey (#888), total inherits text colour, gap 10px. Both are padded to at least three digits (001). Navigation wraps and updates the count through every interaction.
- Project number: keep existing placement; numeric custom labels and automatic visible-project numbers pad to at least three digits. Preserve nonnumeric custom labels.

Keep the existing side_caption field key for content compatibility; change its display label to Image caption and description to the new position. Empty text hides itself; an enabled counter displays even with empty text. No story values are migrated or published.

Implement in static and Next homepages and Storyblok project schema. Keep PR #114 page-load fixes separate. Validate desktop/mobile boundaries, safe links, empty values, independent project counts, wrapping, single-slide and mixed media, tests and production build.
