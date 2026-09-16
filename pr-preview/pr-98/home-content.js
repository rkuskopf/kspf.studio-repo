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
        introEl.textContent = data.intro;
        introEl.setAttribute("title", data.intro);
      }
      document.documentElement.dataset.homeInitialSection =
        data.initialSection === "info" ? "info" : "work";
      const navigation = document.querySelector(".top");
      if (navigation) navigation.hidden = data.showNavigation === false;
    })
    .catch(() => {})
    .finally(() => window.kspfMarkHomeReady?.("home"));
})();
