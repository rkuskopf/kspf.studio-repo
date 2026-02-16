(() => {
  const introEl = document.querySelector(".js-exp-intro");
  const heroTextEl = document.querySelector(".js-exp-hero-text");
  const ctaEl = document.querySelector(".js-exp-cta");

  if (!introEl || !heroTextEl || !ctaEl) return;

  fetch("content/experience.json", { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.navIntro) {
        introEl.textContent = data.navIntro;
        introEl.title = data.navIntro;
      }
      if (data.heroText) heroTextEl.textContent = data.heroText;
      if (data.ctaLabel) ctaEl.textContent = data.ctaLabel;
      if (data.ctaHref) ctaEl.setAttribute("href", data.ctaHref);
    })
    .catch(() => {});
})();
