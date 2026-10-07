# Project caption positions

Approved through the conversation annotation on the proposed three-field layout.

- Project title: rich text below the portrait track, aligned left.
- Category: rich text beside the title, aligned right, on desktop and mobile.
- Side caption: independent optional rich text in the old desktop category position, hidden on mobile.

Empty caption fields display no content. Existing categories remain in the category field; side captions start empty. All fields retain safe links, new-tab settings, and line breaks. Preserve current project-number placement and slideshow interactions.

Implement this in both homepage renderers and Storyblok's project schema. Keep the page-load fixes in PR #114 separate. Validate mobile and desktop boundaries, independent field content, safe links, empty values, and production build.
