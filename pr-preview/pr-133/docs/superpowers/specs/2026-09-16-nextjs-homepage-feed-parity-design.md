# Next.js Homepage Feed and Parity Design

## Scope

Issue #69 completes the Next.js `/` homepage begun in #68. The route will render every visible Storyblok project in configured order and retain the Information and Navigation shell. The Information section is the homepage's footer-equivalent content, intentionally positioned above the project feed; the separate Storyblok `footer_settings` content is not rendered on the homepage.

The static root site and its deployment files remain unchanged. Project detail routes, Storyblok schemas, content migration, and unrelated media-performance work remain outside this issue.

## Data boundary

The existing server-only homepage loader remains the single delivery boundary. It will continue fetching the `home`, `site`, and `projects/` stories in parallel using one resolved published or signed draft version. `HomePageData.project` becomes `HomePageData.projects`, containing the complete visible list returned by the existing ordering and filtering rules.

The current typed Information model remains the homepage's supporting-content boundary. No footer model or additional footer delivery work is introduced. A malformed visible project fails with a clear credential-free boundary error instead of silently dropping content. An empty visible project list remains an error.

## Page composition

`HomeContentView` remains a server component and renders, in document order:

1. Information;
2. the existing homepage navigation;
3. one semantic project section for each `data.projects` entry.

Each project section supplies its own name, `HomepageSlideshow`, and category. Stable Storyblok IDs key the list. The project feed is ordinary server-rendered content, so the temporary `aria-live` region from #68 is removed rather than announcing an entire multi-project feed.

Information continues to render the profile, contact, and service content above Work. This is the intended homepage equivalent of a footer, so there is no repeated footer after the final project.

## Slideshow lifecycle and input

Each project keeps independent slide state. Pointer buttons, left/right arrow keys, touch swipes, wraparound, portrait classification, and single-slide control suppression continue to use the boundary established in #68.

The feed introduces a viewport lifecycle per slideshow using `IntersectionObserver`:

- only the current video in a visible project may autoplay;
- leaving the viewport pauses that video;
- reduced-motion preference always prevents autoplay and looping;
- adjacent image preloading starts only when that project is near the viewport;
- environments without `IntersectionObserver` degrade safely to user-visible media without blocking controls.

This prevents several off-screen projects from playing video or eagerly loading neighbour slides at once. Initial images outside the first project use lazy loading; the first visible project retains eager loading so its media is not delayed.

## Responsive presentation

Every project remains a viewport-height snap panel. Desktop keeps the approved 800px landscape target and portrait 4:5 cap.

Project metadata and media move into a collision-safe three-column layout at wide and tablet widths: name, bounded media, and category. The side tracks take the space their text requires and the media track shrinks before content can overlap. This preserves side metadata through tablet widths without an arbitrary visual jump. At the existing genuinely mobile breakpoint, the project becomes the approved stacked media/name layout and the category is hidden.

The existing Information layout remains readable above the feed at desktop, tablet, and mobile widths. Long project titles and mobile safe-area gutters must not create horizontal overflow.

## Accessibility

Project sections receive accessible names from their visible titles. Slideshow labels remain project-specific, image alt text falls back to the project display name when Storyblok alt text is blank, and video labels use the same fallback. Every interactive control has a unique contextual label and visible keyboard focus. Single-slide projects do not add redundant controls or focus stops.

The DOM and focus order follow the visible page order: Information, navigation, then projects. Motion preference is observed for page transitions, slide transitions, and video playback. Information headings, lists, and links continue to use native semantics.

## Verification and parity evidence

Focused tests will cover:

- complete ordered project delivery, filtering, and empty-feed failure;
- Information remaining above the complete project feed;
- server markup for all projects and removal of the live region;
- independent slideshow state, single-slide behaviour, pointer/keyboard/touch input;
- viewport-gated video playback and neighbour preloading;
- reduced-motion behaviour and accessible labels.

Final verification runs the full Vitest suite, TypeScript/Next production build, and browser checks at representative desktop, tablet, and mobile widths. Side-by-side screenshots will record Information in its footer-equivalent position above the feed, Navigation, representative landscape and portrait projects, and long-title/collision behaviour. The evidence will be committed or linked from the pull request so issue #69 has a durable parity record.

## Alternatives considered

A single client-side controller for the whole feed would centralize visibility and slide state, but would hydrate content that can remain server-rendered and make independent slideshows more tightly coupled. Reusing the legacy DOM and scripts would reduce initial porting work but abandon the typed server/client boundary proved in #68. Extending the existing server composition with small independent slideshow islands is the narrowest and most maintainable completion path.
