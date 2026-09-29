(() => {
  const contentUrl =
    typeof window.kspfContentUrl === "function" ? window.kspfContentUrl : (path) => path;
  const metaDescription = document.querySelector('meta[name="description"]');
  const introEl = document.querySelector(".js-home-intro");

  if (!metaDescription && !introEl) {
    window.kspfMarkHomeReady?.("home");
    return;
  }

  fetch(contentUrl("content/home.json"), { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.title) document.title = data.title;
      if (data.metaDescription && metaDescription) {
        metaDescription.setAttribute("content", data.metaDescription);
      }
      if (data.intro !== undefined && data.intro !== null && introEl) {
        const intro = typeof data.intro === "string" ? data.intro : "";
        introEl.textContent = intro;
        introEl.setAttribute("title", intro);
        introEl.hidden = !intro.trim();
      }
      document.documentElement.dataset.homeInitialSection =
        data.initialSection === "info" ? "info" : "work";
      const navigation = document.querySelector(".top");
      if (navigation) navigation.hidden = data.showNavigation === false;
    })
    .catch(() => {})
    .finally(() => window.kspfMarkHomeReady?.("home"));
})();
