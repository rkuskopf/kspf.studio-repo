# Next.js Homepage First Project Design

## Scope

Issue #68 is the tracer slice for epic #57. Replace the existing Next.js `/` homepage tracer with the current homepage shell, Information section, Navigation, and the first visible production project. The static root site and its deployment files remain unchanged. The rest of the project feed and footer remain issue #69.

The reference content is the current published Storyblok space. The first visible project is selected by the same rules as the static deployment: sort project stories by configured `order` (falling back to Storyblok position), remove projects with `show_on_home: false`, and render the first result. At the time of design this resolves to ARCTERYX, but the implementation must not hard-code that project.

## Architecture

The Next.js route remains a server component. A server-only aggregate loader resolves published versus signed local draft delivery once, then fetches `home`, `site`, and the `projects/` collection in parallel with the same token, region, version, and cache version. It returns a typed `HomePageData` containing the home document, site/navigation content, and one `HomepageProject` presentation record.

Homepage project mapping is separate from the canonical project-page mapping. A homepage project needs legacy presentation fields (`display_name`, `category`, `slides`, `alt`, `show_on_home`, and `order`) and must not require `page_enabled` or a canonical project-page body. Slide assets accept Storyblok assets and the existing `legacy_url` fallback so the current Storyblok-to-Cloudinary path remains intact.

The server-rendered page owns semantic structure and content. A focused client `HomepageSlideshow` owns only interactive slide state, previous/next buttons, keyboard arrows, touch swipes, media switching, and video playback. Single-slide projects expose no inactive controls. Images retain meaningful alt text; videos are muted, looped, and inline.

## Presentation and behaviour

The Next.js homepage uses scoped `homepage-*` classes so the existing project detail route keeps its styles. Values are ported from the approved static homepage rather than importing the whole legacy stylesheet: 15px page gutters, Courier typography, viewport-height project panel, 800px desktop media target, the current portrait 4:5 cap, mobile media/title alignment, and the 10px mobile title gap fixed in #94.

Information appears before Work in document order. Navigation links target those sections and preserve the current label hierarchy. Smooth scrolling and the page entrance animation are disabled under `prefers-reduced-motion`. Slide changes avoid motion when reduced motion is requested.

## Validation and failure behaviour

Storyblok responses are validated at the delivery boundary. Missing site/home stories, wrong components, malformed required fields, or no visible project produce clear credential-free errors. Invalid project records do not silently become a different first project; mapping errors identify the project response without printing the token-bearing URL.

Focused tests cover mapping and ordering, shared published/draft server delivery, semantic server markup, single- and multi-slide presentation, and slideshow state transitions. Final verification runs the full Vitest suite, TypeScript/Next production build, and desktop/mobile browser comparisons against the current homepage. No root static HTML, CSS, JavaScript, or deployment workflow is changed.
