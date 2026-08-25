(() => {
  const contentUrl =
    typeof window.kspfContentUrl === "function" ? window.kspfContentUrl : (path) => path;
  const navIntroEl = document.querySelector(".js-exp-intro");
  const heroTextEl = document.querySelector(".js-exp-hero-text");
  const ctaEl = document.querySelector(".js-exp-cta");
  const casesTitleEl = document.querySelector(".js-exp-cases-title");
  const casesGridEl = document.querySelector(".js-exp-cases-grid");

  if (!navIntroEl && !heroTextEl && !ctaEl && !casesTitleEl && !casesGridEl) return;

  const renderCases = (cases) => {
    if (!casesGridEl) return;
    casesGridEl.innerHTML = "";
    cases.forEach((caseItem) => {
      if (!caseItem) return;
      const article = document.createElement("article");
      article.className = "exp-case";

      const wrapper = caseItem.href ? document.createElement("a") : document.createElement("div");
      wrapper.className = "exp-case__link";
      if (caseItem.href) wrapper.href = caseItem.href;

      const media = document.createElement("div");
      media.className = "exp-case__media";
      if (caseItem.mediaClass) media.classList.add(caseItem.mediaClass);
      if (caseItem.mediaImage) {
        media.style.backgroundImage = `url(\"${caseItem.mediaImage}\")`;
      }
      media.setAttribute("aria-hidden", "true");

      const title = document.createElement("h3");
      title.className = "exp-case__title";
      title.textContent = caseItem.title || "";

      const company = document.createElement("span");
      company.className = "exp-case__company";
      company.textContent = caseItem.company || "";

      const service = document.createElement("span");
      service.className = "exp-case__service";
      service.textContent = caseItem.service || "";

      wrapper.append(media, title, company, service);
      article.appendChild(wrapper);
      casesGridEl.appendChild(article);
    });
  };

  fetch(contentUrl("content/experience.json"), { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.navIntro !== undefined && data.navIntro !== null && navIntroEl) {
        navIntroEl.textContent = data.navIntro;
        navIntroEl.setAttribute("title", data.navIntro);
      }
      if (data.heroText && heroTextEl) heroTextEl.textContent = data.heroText;
      if (data.ctaLabel && ctaEl) ctaEl.textContent = data.ctaLabel;
      if (data.ctaHref && ctaEl) ctaEl.setAttribute("href", data.ctaHref);
      if (data.casesTitle && casesTitleEl) casesTitleEl.textContent = data.casesTitle;
      if (Array.isArray(data.cases)) renderCases(data.cases);
    })
    .catch(() => {});
})();
