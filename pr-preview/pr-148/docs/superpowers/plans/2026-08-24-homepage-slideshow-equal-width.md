# Homepage Slideshow Equal Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every homepage slideshow the same responsive `800px` maximum width while preserving each asset's natural aspect ratio.

**Architecture:** The existing project grid will continue to calculate the space available between the two metadata columns. Its intended hero width will come from the shared `--hero-width` token instead of multiplying the viewport-derived height by each project's aspect ratio. The existing `.hero` aspect ratio will continue to determine height, so media resizes proportionally without cropping or stretching.

**Tech Stack:** Static HTML, CSS custom properties, existing slideshow JavaScript, Playwright CLI browser verification.

## Global Constraints

- Preserve each project's natural media aspect ratio.
- Do not stretch or crop slideshow media.
- Preserve the existing metadata-clearance calculation and mobile single-column layout.
- Do not change project content, slide order, media files, slideshow transitions, navigation, or case-study layouts.
- Use the production Storyblok project assets for visual verification.

---

### Task 1: Equalize homepage slideshow widths

**Files:**
- Modify: `style.css:402-438`
- Modify: `index.html:10`

**Interfaces:**
- Consumes: root custom property `--hero-width: 800px`, per-project `--hero-aspect`, and per-project `--project-meta-width` set by `slideshow.js`.
- Produces: `--hero-intended-width: var(--hero-width)` and a `.hero` maximum width sourced from the same token.

- [ ] **Step 1: Record the failing production baseline**

Open `https://kspf.au` at `1440x1000` and evaluate each `.hero` bounding box. The current expected result is AP—REPS at about `783.36px` while Jak Architecture, Albus Lumen, Aesop, and Christopher Myles Henderson are `800px`.

```bash
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session equal-width open https://kspf.au
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session equal-width resize 1440 1000
```

Browser assertion:

```js
Array.from(document.querySelectorAll(".project-block")).map((block) => ({
  title: block.querySelector(".project__name")?.textContent,
  width: block.querySelector(".hero").getBoundingClientRect().width,
}));
```

- [ ] **Step 2: Use the shared maximum width for project frames**

Change the project-level intended width and the hero's own cap to use `--hero-width`:

```css
.project-block {
  --hero-intended-width: var(--hero-width);
}

.hero {
  width: min(100%, var(--hero-width));
}
```

Leave `--hero-frame`, `aspect-ratio`, and all media sizing rules unchanged.

- [ ] **Step 3: Increment the stylesheet cache key**

Update the homepage stylesheet link:

```html
<link rel="stylesheet" href="style.css?v=20260824-1" />
```

- [ ] **Step 4: Run static checks**

Run:

```bash
git diff --check
rg -n -- "--hero-width|--hero-intended-width|style.css\?v=" style.css index.html
```

Expected: no whitespace errors; `--hero-intended-width` and `.hero` both use `--hero-width`; `index.html` uses `style.css?v=20260824-1`.

- [ ] **Step 5: Verify responsive rendering with production assets**

Open `https://kspf.au`, inject the complete modified local stylesheet after the deployed stylesheet, and inspect `.hero` plus its visible `.hero__media` at `1440x1000`, `1024x900`, `768x900`, and `390x844`:

```bash
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session equal-width open https://kspf.au
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session equal-width run-code 'async (page) => { await page.addStyleTag({ path: "/Users/rowankuskopf/.codex/worktrees/2fcc/kspf.studio-repo/style.css" }); }'
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session equal-width resize 1440 1000
```

For each viewport, evaluate:

```js
Array.from(document.querySelectorAll(".project-block")).map((block) => {
  const hero = block.querySelector(".hero");
  const media = hero.querySelector(".hero__media.is-visible, .hero__media.is-active");
  const heroRect = hero.getBoundingClientRect();
  const mediaRect = media?.getBoundingClientRect();
  return {
    title: block.querySelector(".project__name")?.textContent,
    aspect: Number.parseFloat(getComputedStyle(hero).getPropertyValue("--hero-aspect")),
    heroWidth: heroRect.width,
    heroHeight: heroRect.height,
    mediaWidth: mediaRect?.width,
    mediaHeight: mediaRect?.height,
  };
});
```

Expected:

- At `1440x1000`, every homepage hero frame is `800px` wide.
- At narrower widths, each frame is no wider than the space available to it.
- Each frame's measured `width / height` matches its `--hero-aspect` within browser rounding.
- Visible media is neither stretched nor cropped.
- Metadata does not overlap the hero frame.
- The mobile layout remains a single column with the title below the slideshow.

- [ ] **Step 6: Commit the implementation**

```bash
git add style.css index.html
git commit -m "fix: equalize homepage slideshow widths"
```
