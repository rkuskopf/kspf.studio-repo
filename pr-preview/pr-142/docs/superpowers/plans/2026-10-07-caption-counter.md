# Caption Counter Implementation Plan

**Goal:** Restore Category's desktop side position and add an optional live counter to the new below-image caption.

**Architecture:** Preserve side_caption content key, expose show_slideshow_counter as showSlideshowCounter. Static slideshow updates sibling counter spans on applySlide; Next slideshow owns caption markup alongside its existing local index state. Keep Category in the below-image caption on mobile through CSS display:contents, and the desktop side rail through its existing class.

**Tech Stack:** Vanilla JS/CSS, Next React, Storyblok.

- [x] Map optional boolean in both delivery paths and add schema settings. Verify absent/false/true values and existing text compatibility.
- [x] Move new caption to below-image right slot, restore desktop Category position; mobile stacks Category and new caption in one right column. Preserve safe links and slideshow hit clearance.
- [x] Render current/total padded to three digits with 10px flex gap and grey current. Update static applySlide and React local state. Pad numeric project labels to three digits.
- [x] Verify mixed image/video counts, wrapping, independent instances, single slide, and toggle fallback; run Node/Vitest suites, verifier, production build and browser checks at 393/857/858/1440 widths.
- [x] Update CMS schema if authenticated internal browser permits; save component only, no project publishing. Update existing PR #116 after verification.
