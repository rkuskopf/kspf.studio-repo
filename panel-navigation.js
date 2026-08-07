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

  const isKnownHash = (hash) =>
    hash === "" ||
    hash === "#" ||
    hash === "#home" ||
    hash === "#info" ||
    hash === "#case-studies";

  const shouldNormalizeHash = (hash) => !isKnownHash(hash) || hash === "#home";

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      hashForView,
      normalizeView,
      shouldNormalizeHash,
      viewFromHash,
    };
  }

  if (typeof document === "undefined" || typeof window === "undefined") return;

  document.documentElement.classList.add("has-panel-navigation");

  const init = () => {
    const root = document.querySelector("[data-panel-navigation]");
    const links = Array.from(document.querySelectorAll("[data-panel-target]"));
    const panels = Array.from(document.querySelectorAll("[data-panel]"));
    if (!root || links.length === 0 || panels.length !== 3) return;

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
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        event.preventDefault();
        setView(link.dataset.panelTarget, "push");
      });
    });

    const restoreFromLocation = () => {
      const hash = window.location.hash;
      setView(viewFromHash(hash), shouldNormalizeHash(hash) ? "replace" : null);
    };
    window.addEventListener("popstate", restoreFromLocation);
    window.addEventListener("hashchange", restoreFromLocation);

    restoreFromLocation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
