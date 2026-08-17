# Horizontal Panel Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build click-only horizontal navigation between Info, Home, and an empty Case Studies panel while preserving Home's vertical project scrolling.

**Architecture:** Progressively enhance three normal document sections into a viewport-height, three-panel CSS transform rail. A focused `panel-navigation.js` controller owns panel state, accessibility, and URL history; CSS alone owns the 1000 ms horizontal transition and reduced-motion override.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js built-in test runner, Python static server, browser inspection.

## Global Constraints

- Panel order is exactly `[ Info ] [ Home ] [ Case Studies ]`, initially centred on Home.
- Horizontal movement is triggered only by `Info`, `kspf`, and `Case Studies` navigation clicks or equivalent keyboard activation.
- Do not add horizontal wheel, trackpad, touch-drag, or swipe navigation.
- Keep navigation fixed while the content rail moves.
- Keep Home's current vertical project snap behavior and restore its scroll position after a panel round trip.
- Use a 1000 ms `cubic-bezier(0.65, 0, 0.35, 1)` transform transition.
- Under `prefers-reduced-motion: reduce`, change panels immediately and do not force motion.
- Keep Case Studies visually empty; tile and content design is out of scope.
- Preserve current Info copy/layout and existing case-study pages.
- Preserve a readable anchor-based document if `panel-navigation.js` fails.

---

### Task 1: Panel State Controller

**Files:**
- Create: `panel-navigation.js`
- Create: `tests/panel-navigation.test.cjs`

**Interfaces:**
- Consumes: navigation anchors with `data-panel-target="info|home|case-studies"`, a root with `data-panel-navigation`, and panels with matching `data-panel` values.
- Produces: `viewFromHash(hash)`, `hashForView(view)`, and `normalizeView(view)` pure helpers; runtime `data-view`, `aria-current`, `aria-hidden`, and `inert` state.

- [ ] **Step 1: Write the failing state-mapping tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hashForView,
  normalizeView,
  viewFromHash,
} = require("../panel-navigation.js");

test("maps supported hashes to panel views", () => {
  assert.equal(viewFromHash("#info"), "info");
  assert.equal(viewFromHash("#case-studies"), "case-studies");
  assert.equal(viewFromHash(""), "home");
  assert.equal(viewFromHash("#home"), "home");
});

test("falls back to home for unknown views and hashes", () => {
  assert.equal(normalizeView("other"), "home");
  assert.equal(viewFromHash("#other"), "home");
});

test("uses no hash for home", () => {
  assert.equal(hashForView("home"), "");
  assert.equal(hashForView("info"), "#info");
  assert.equal(hashForView("case-studies"), "#case-studies");
});
```

- [ ] **Step 2: Run the test and confirm the module is missing**

Run: `node --test tests/panel-navigation.test.cjs`

Expected: FAIL with `Cannot find module '../panel-navigation.js'`.

- [ ] **Step 3: Implement the state helpers and DOM controller**

Create `panel-navigation.js` as this focused IIFE:

```js
(function () {
  const VIEWS = new Set(["info", "home", "case-studies"]);
  const normalizeView = (view) => (VIEWS.has(view) ? view : "home");
  const viewFromHash = (hash) => {
    if (!hash || hash === "#" || hash === "#home") return "home";
    return normalizeView(hash.slice(1));
  };
  const hashForView = (view) => {
    const normalized = normalizeView(view);
    return normalized === "home" ? "" : `#${normalized}`;
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { hashForView, normalizeView, viewFromHash };
  }

  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.documentElement.classList.add("has-panel-navigation");

  const init = () => {
    const root = document.querySelector("[data-panel-navigation]");
    const links = Array.from(document.querySelectorAll("[data-panel-target]"));
    const panels = Array.from(document.querySelectorAll("[data-panel]"));
    if (!root || links.length === 0 || panels.length !== 3) return;

    const isKnownHash = (hash) =>
      hash === "" || hash === "#" || hash === "#home" ||
      hash === "#info" || hash === "#case-studies";

    const syncUrl = (view, mode) => {
      if (!mode) return;
      const url = new URL(window.location.href);
      url.hash = hashForView(view);
      window.history[`${mode}State`](null, "", url);
    };

    const setView = (requestedView, historyMode = null) => {
      const view = normalizeView(requestedView);
      root.dataset.view = view;

      links.forEach((link) => {
        const active = link.dataset.panelTarget === view;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });

      panels.forEach((panel) => {
        const active = panel.dataset.panel === view;
        panel.setAttribute("aria-hidden", active ? "false" : "true");
        if (active) panel.removeAttribute("inert");
        else panel.setAttribute("inert", "");
      });

      syncUrl(view, historyMode);
    };

    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        if (
          event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey
        ) return;
        event.preventDefault();
        setView(link.dataset.panelTarget, "push");
      });
    });

    const restoreFromLocation = () => setView(viewFromHash(window.location.hash));
    window.addEventListener("popstate", restoreFromLocation);
    window.addEventListener("hashchange", restoreFromLocation);

    const initialHash = window.location.hash;
    setView(viewFromHash(initialHash), isKnownHash(initialHash) ? null : "replace");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
```

The early class addition prevents an initial flash of Info. Modified-clicks keep normal browser behavior. A normal click calls `preventDefault()` and retargets the CSS state immediately, allowing the current transform transition to continue smoothly from its rendered position.

- [ ] **Step 4: Run the controller tests**

Run: `node --test tests/panel-navigation.test.cjs`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the controller**

```bash
git add panel-navigation.js tests/panel-navigation.test.cjs
git commit -m "feat: add homepage panel navigation controller"
```

---

### Task 2: Homepage Panel Rail

**Files:**
- Modify: `index.html:1-52`
- Modify: `style.css:6-131`
- Modify: `style.css:173-215`
- Modify: `style.css:248-384`

**Interfaces:**
- Consumes: the controller's `has-panel-navigation`, `data-view`, `data-panel-target`, and `data-panel` contract from Task 1.
- Produces: a clipped viewport stage, one transform rail, three independently scrolling panels, and a fixed active-state navigation.

- [ ] **Step 1: Convert the homepage to three progressively enhanced sections**

In `index.html`:

- remove `data-force-scroll` from `<html>`;
- load `panel-navigation.js` before `style.css` so it can add the enhancement class before first paint;
- remove homepage loads of `clients-overlay.js` and `smooth-scroll.js`;
- use `#info`, `#home`, and `#case-studies` fallback anchors with `data-panel-target` values;
- rename `Index` to `Case Studies`;
- wrap Home, Info, and Case Studies in `[data-panel-navigation] > .home-panel-rail`;
- keep Home first in DOM order for the no-JavaScript fallback, then use CSS `order` to place Info visually to its left;
- move the existing information markup into `[data-panel="info"]`; and
- omit the obsolete hidden homepage footer.

The enhanced structure must follow this contract:

```html
<nav class="nav" aria-label="Primary">
  <a class="nav__link nav__link--information" data-panel-target="info" href="#info">Info</a>
  <a class="nav__link nav__link--home is-active" data-panel-target="home" href="#home" aria-current="page">kspf</a>
  <a class="nav__link nav__link--index" data-panel-target="case-studies" href="#case-studies">Case Studies</a>
</nav>
<div class="home-panel-stage" data-panel-navigation data-view="home">
  <div class="home-panel-rail">
    <main class="home-panel home-panel--home" id="home" data-panel="home">...</main>
    <section class="home-panel home-panel--info information-overlay" id="info" data-panel="info" aria-label="Information">...</section>
    <section class="home-panel home-panel--case-studies" id="case-studies" data-panel="case-studies" aria-label="Case Studies"></section>
  </div>
</div>
```

- [ ] **Step 2: Move vertical snap ownership from the document to Home**

Replace the home-only `html` snap rule with enhanced stage rules:

```css
:root {
  --panel-viewport-w: 100vw;
  --panel-viewport-h: 100vh;
}

@supports (width: 100dvw) {
  :root {
    --panel-viewport-w: 100dvw;
    --panel-viewport-h: 100dvh;
  }
}

html.has-panel-navigation,
html.has-panel-navigation body[data-page="home"] {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.has-panel-navigation .home-panel-stage {
  width: var(--panel-viewport-w);
  height: var(--panel-viewport-h);
  overflow: hidden;
}

.has-panel-navigation .home-panel-rail {
  display: flex;
  width: calc(var(--panel-viewport-w) * 3);
  height: 100%;
  transform: translate3d(calc(var(--panel-viewport-w) * -1), 0, 0);
  transition: transform 1000ms cubic-bezier(0.65, 0, 0.35, 1);
  will-change: transform;
}

.has-panel-navigation [data-view="info"] .home-panel-rail {
  transform: translate3d(0, 0, 0);
}

.has-panel-navigation [data-view="case-studies"] .home-panel-rail {
  transform: translate3d(calc(var(--panel-viewport-w) * -2), 0, 0);
}

.has-panel-navigation .home-panel {
  flex: 0 0 var(--panel-viewport-w);
  width: var(--panel-viewport-w);
  height: var(--panel-viewport-h);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-x: none;
  touch-action: pan-y;
}

.has-panel-navigation .home-panel--info { order: 1; }
.has-panel-navigation .home-panel--home {
  order: 2;
  scroll-snap-type: y mandatory;
}
.has-panel-navigation .home-panel--case-studies { order: 3; }
```

Keep `.project-block` at `min-height: 100dvh` with `scroll-snap-align: start`. Add panel-appropriate padding to Info while leaving the Case Studies surface empty.

- [ ] **Step 3: Add active and reduced-motion styles**

```css
.nav__link.is-active {
  text-decoration: underline;
  text-decoration-thickness: 0.5px;
  text-underline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .has-panel-navigation .home-panel-rail {
    transition: none;
  }
}
```

Remove homepage-specific rules that treat `.information-overlay` as a fixed fading overlay. Retain shared overlay rules needed by non-home pages.

- [ ] **Step 4: Run static and unit checks**

Run:

```bash
node --test tests/panel-navigation.test.cjs
git diff --check
rg -n "data-force-scroll|smooth-scroll.js|clients-overlay.js|>Index<|href=\"#services\"" index.html
```

Expected: tests PASS, diff check is clean, and the final search returns no matches.

- [ ] **Step 5: Commit the rail**

```bash
git add index.html style.css
git commit -m "feat: add horizontal homepage panel rail"
```

---

### Task 3: Browser Verification and Corrections

**Files:**
- Modify if verification exposes a defect: `panel-navigation.js`
- Modify if verification exposes a defect: `index.html`
- Modify if verification exposes a defect: `style.css`

**Interfaces:**
- Consumes: complete controller and rail from Tasks 1-2.
- Produces: browser-verified interaction at desktop, tablet, mobile, keyboard, and reduced-motion settings.

- [ ] **Step 1: Start and verify the static preview**

Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root, then run `curl -I http://127.0.0.1:8000/`.

Expected: `HTTP/1.0 200 OK` or `HTTP/1.1 200 OK`.

- [ ] **Step 2: Verify the desktop interaction at 1440 and 1024 pixels**

At each width confirm Home appears first without an Info flash; Info enters from the left; Case Studies enters from the right; kspf returns Home; the navigation does not move; repeated and mid-transition clicks retarget continuously; and Home retains its vertical scroll position.

Inspect runtime state after every destination: exactly one navigation link has `aria-current="page"`, exactly one panel has `aria-hidden="false"`, and the other two panels have `inert`.

- [ ] **Step 3: Verify history, fallback, and keyboard behavior**

Confirm direct loads of `/#info` and `/#case-studies`, back/forward transitions, reloads, and an unknown hash. Tab through each state and verify focus never enters an offscreen panel. Temporarily block `panel-navigation.js`, reload, and confirm Home is the first readable section and the three anchor links reach their destinations vertically.

- [ ] **Step 4: Verify mobile behavior at 768 and 390 pixels**

Confirm no horizontal scrollbar or adjacent-panel edge is visible; vertical project scrolling and snapping still work; touch movement stays vertical; Info can scroll if necessary; and the empty Case Studies panel fills the viewport.

- [ ] **Step 5: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce`, click all three navigation items, and confirm the computed rail transition duration is `0s` and panel changes are immediate.

- [ ] **Step 6: Apply only evidence-backed corrections and rerun checks**

For any defect, make the smallest correction in the responsible file. Then rerun:

```bash
node --test tests/panel-navigation.test.cjs
git diff --check
curl -I http://127.0.0.1:8000/
```

- [ ] **Step 7: Commit verified corrections**

If files changed during browser verification:

```bash
git add panel-navigation.js index.html style.css tests/panel-navigation.test.cjs
git commit -m "fix: polish horizontal panel navigation"
```

If no corrections were needed, do not create an empty commit.
