# Portrait Media Viewport Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep portrait homepage slideshow media within the viewport while preserving natural aspect ratio and existing landscape sizing.

**Architecture:** Reuse the existing `.hero.is-portrait` state produced by `slideshow.js` and apply a portrait-only CSS maximum height. Verify the actual rendered dimensions with a Playwright red/green check instead of coupling a test to CSS source text; no content model or JavaScript change is required.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner, Playwright CLI browser verification.

## Global Constraints

- Portrait media uses `max-height: min(75dvh, 590px)` with `min(75vh, 590px)` immediately before it as the fallback.
- Portrait media remains centred, uncropped, and at its natural aspect ratio.
- Landscape media retains the current shared-width behaviour.
- Do not change Storyblok fields, slide data, Cloudinary delivery, Next.js code, project order, navigation, or media files.

---

### Task 1: Constrain portrait homepage media

**Files:**
- Modify: `style.css:469-487`
- Modify: `index.html:19`

**Interfaces:**
- Consumes: `.hero.is-portrait`, which `slideshow.js` applies to the slideshow root when the active asset aspect ratio is below `1`.
- Produces: a `.hero.is-portrait .hero__media` rule with the approved viewport and pixel maximums, plus homepage stylesheet cache key `20260825-1`.

- [ ] **Step 1: Record the failing rendered baseline**

Open the published homepage at `1440 × 900`, snapshot it, and fail visibly unless the current Jak Architecture portrait video exceeds the approved `590px` ceiling:

```bash
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap open https://kspf.au --headed
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap resize 1440 900
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap snapshot
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap run-code 'async (page) => { const result = await page.evaluate(() => { const hero = document.querySelector(".hero.is-portrait"); const media = Array.from(hero.querySelectorAll(".hero__media")).find((element) => !element.classList.contains("is-hidden")); const rect = media.getBoundingClientRect(); return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom }; }); if (result.height > 590) throw new Error(`Portrait exceeds the approved 590px cap: ${JSON.stringify(result)}`); console.log(JSON.stringify(result)); }'
```

Expected red baseline: FAIL with `Portrait exceeds the approved 590px cap` and dimensions of approximately `720 × 960`, with the top above `0` and bottom beyond `900`. This proves the published portrait exceeds the approved cap before local CSS is applied.

- [ ] **Step 2: Add the minimal portrait-only CSS and cache revision**

Add immediately after the base `.hero__media` rule in `style.css`:

```css
.hero.is-portrait .hero__media {
  width: auto;
  height: auto;
  max-height: min(75vh, 590px);
  max-height: min(75dvh, 590px);
  object-fit: contain;
}
```

Update the stylesheet link in `index.html`:

```html
<link rel="stylesheet" href="style.css?v=20260825-1" />
```

- [ ] **Step 3: Verify desktop and mobile rendering with the published portrait asset**

Open the live homepage, inject the complete modified local stylesheet after its deployed stylesheet, then measure the visible Jak Architecture media:

```bash
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap open https://kspf.au --headed
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap snapshot
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap run-code 'async (page) => { await page.addStyleTag({ path: "/Users/rowankuskopf/.codex/worktrees/2df2/kspf.studio-repo/style.css" }); }'
/Users/rowankuskopf/.codex/skills/playwright/scripts/playwright_cli.sh --session portrait-cap resize 1440 900
```

Evaluate this expression at desktop and again after resizing to `390 × 844`:

```js
JSON.stringify((() => {
  const hero = document.querySelector(".hero.is-portrait");
  const media = Array.from(hero.querySelectorAll(".hero__media"))
    .find((element) => !element.classList.contains("is-hidden"));
  const rect = media.getBoundingClientRect();
  return {
    viewport: { width: innerWidth, height: innerHeight },
    media: { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom },
    maxHeight: getComputedStyle(media).maxHeight,
    objectFit: getComputedStyle(media).objectFit,
  };
})())
```

Expected at `1440 × 900`: media height is `590px`, `top` and `bottom` are inside `0..900`, `maxHeight` is `590px`, and `objectFit` is `contain`.

Expected at `390 × 844`: both dimensions fit the viewport; width becomes the limiting dimension when it produces a height below `590px`.

Click `Next image` from the fresh snapshot and confirm the active landscape slide retains the existing `800px` desktop width and has no portrait maximum. Scroll one viewport and confirm vertical snap navigation still advances to AP—REPS. Run `console error` and expect zero messages.

- [ ] **Step 4: Run the full static test suite**

Run:

```bash
node --test scripts/tests/*.test.mjs
git diff --check
```

Expected: the existing suite has zero failures and the diff contains no whitespace errors.

- [ ] **Step 5: Commit the implementation**

```bash
git add style.css index.html
git commit -m "fix: contain portrait media within viewport"
```
