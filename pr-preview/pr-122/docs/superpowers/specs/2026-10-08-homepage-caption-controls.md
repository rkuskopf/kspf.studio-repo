# Homepage caption controls

Approved in conversation: one layout setting on Home for all projects, with options to hide individual caption types.

Presets: Current (number left, Category right), Flipped (Category left, number right), Below image (title/category on first caption row, counter on second). Below and flipped swaps title and Category in the first caption row. Number stays beside the image on the left and counter stays below right. On mobile, Current and Flipped place Category above the title on the left with the counter on the right aligned to the top Category row. Below presets retain the mobile title-left / Category-right placement. Project numbers stay desktop-only.

Independent Show toggles: project numbers, project titles, Categories, image captions / counters. Missing settings keep current layout and all labels visible. Hiding caption text does not remove image alt text or slideshow controls. Hide image captions also hides enabled counters. Settings are read from saved draft Home content for local preview and published Home content for deployed site. Preserve per-project counter toggle, text, safe links, and numbering.

Implement in static and Next renderers with shared delivery defaults. Prerender the same attributes that static hydration applies, preventing position changes on load. Add fields to Home component only; do not save or publish Home story values. Keep implementation uncommitted for local review.

Keep an 80px gap from Information to Projects across viewport widths. Keep Information detail spacing at 28px on both sides of the 858px breakpoint. Reserve the two-row mobile caption height in Current/Flipped desktop layouts when Category is visible, preventing the following projects from shifting when Category moves below the image.

Keep homepage project gaps at 70px across all viewport widths; remove the 1280px gap reduction.
