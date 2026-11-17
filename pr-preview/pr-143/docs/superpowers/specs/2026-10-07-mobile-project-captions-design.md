# Mobile project captions

Approved in chat on 7 October 2026. Implemented locally and verified; Storyblok field schema updated, existing content preserved.

At widths through 857px, show the project title and category together below the stable slideshow container, retaining the 20px gap. Centre the caption row at the portrait width: title on the left and category on the right, with first lines aligned. Each field wraps within its own column; the row reserves the full height of both fields. Keep this position across slide orientation changes. Preserve desktop metadata placement and portrait sizing.

Convert the visible homepage title field (`project.display_name`) to Storyblok rich text. Preserve existing text, support paragraph and hard-break line breaks using the same plain-text conversion as category, and continue accepting legacy strings. Keep the separate project-page `title` field as text. Apply to both static and Next.js homepage paths. Do not publish content or commit implementation without user authorization.

Verify rich-text mapping, multiline rendering, mobile geometry at narrow widths and 857px, desktop at 858px, and slide transitions. Run existing Node and Vitest suites and production build.

## Issue #112 link follow-up

The user authorized the additional issue comment requesting clickable rich-text links and asked for a PR. Preserve safe link marks in both caption fields using optional linked text runs, alongside the existing plain-text values for accessibility. Render real underlined anchors with inherited typography, keyboard focus outlines, and noopener/noreferrer when opening a new tab. Preserve paragraph/hard-break line breaks. Request resolved internal links from Storyblok and use the response links array to resolve UUIDs to paths. Accept web, email, telephone, root-relative and fragment URLs; render unsafe destinations as plain text. Keep existing unlinked JSON compatible.

The schema has been updated remotely; all eight existing project content objects were verified unchanged. No stories were published. Commit and create a PR after verification, as requested. Deployment remains a separate step.
