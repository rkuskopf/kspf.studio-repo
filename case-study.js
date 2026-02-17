(() => {
  const banner = document.querySelector(".case-banner[data-case]");
  if (!banner) return;

  const titleEl = banner.querySelector(".js-case-title");
  const summaryEl = banner.querySelector(".js-case-summary");
  const roleLabelEl = banner.querySelector(".js-case-role-label");
  const roleValueEl = banner.querySelector(".js-case-role-value");
  const slideshow = document.querySelector(".js-case-slideshow");
  const slideshowImg = slideshow ? slideshow.querySelectorAll(".hero__img") : [];
  const slideshowVideo = slideshow ? slideshow.querySelector(".hero__video") : null;
  const tabButtons = document.querySelectorAll(".case-tabs__tab");
  const tabPanels = document.querySelectorAll(".case-tabs__panel");
  const src = banner.dataset.case;
  const isVideoSrc = (value) => /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(value || "");

  const buildTabSlideshow = (slides, label) => {
    if (!Array.isArray(slides) || !slides.length) return null;
    const figure = document.createElement("figure");
    figure.className = "hero js-slideshow case-tabs__slideshow";
    figure.tabIndex = 0;
    figure.dataset.slides = JSON.stringify(slides);

    const prev = document.createElement("button");
    prev.className = "hero__hit hero__hit--prev";
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous image");

    const next = document.createElement("button");
    next.className = "hero__hit hero__hit--next";
    next.type = "button";
    next.setAttribute("aria-label", "Next image");

    const img = document.createElement("img");
    img.className = "hero__media hero__img";
    img.alt = label ? `${label} slide` : "Case study slide";
    img.loading = "lazy";

    const video = document.createElement("video");
    video.className = "hero__media hero__video";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";

    const firstSlide = slides[0] || "";
    const startsWithVideo = isVideoSrc(firstSlide);
    if (startsWithVideo) {
      img.classList.add("is-hidden");
      video.src = firstSlide;
    } else {
      const firstImage = slides.find((src) => src && !isVideoSrc(src)) || firstSlide;
      img.src = firstImage;
      video.classList.add("is-hidden");
    }

    figure.append(prev, next, img, video);
    return figure;
  };

  const applyTabs = (tabsData) => {
    if (!tabButtons.length || !tabPanels.length) return false;
    if (!tabsData) return false;
    const list = Array.isArray(tabsData) ? tabsData : [];
    const byKey = new Map();
    list.forEach((tab) => {
      if (tab && tab.key) byKey.set(tab.key, tab);
    });

    tabButtons.forEach((tabButton, index) => {
      const key = tabButton.dataset.tab || "";
      const tabData = byKey.get(key) || list[index];
      if (!tabData) return;

      if (tabData.label) tabButton.textContent = tabData.label;

      const panel = document.querySelector(`.case-tabs__panel[data-panel="${key}"]`);
      if (!panel) return;

      const subtitleEl = panel.querySelector(".case-tabs__subtitle");
      if (subtitleEl && Object.prototype.hasOwnProperty.call(tabData, "subtitle")) {
        subtitleEl.textContent = tabData.subtitle || "";
      }

      const bodyEl = panel.querySelector(".case-tabs__text p");
      if (bodyEl && Object.prototype.hasOwnProperty.call(tabData, "body")) {
        bodyEl.textContent = tabData.body || "";
      }

      const mediaEl = panel.querySelector(".case-tabs__media");
      if (mediaEl && Array.isArray(tabData.slides)) {
        mediaEl.innerHTML = "";
        const slideshowEl = buildTabSlideshow(tabData.slides, tabData.label || tabData.subtitle);
        if (slideshowEl) mediaEl.appendChild(slideshowEl);
      }
    });

    return true;
  };

  if (!src) return;

  fetch(src, { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.title && titleEl) titleEl.textContent = data.title;
      if (data.summary && summaryEl) summaryEl.textContent = data.summary;
      if (data.roleLabel && roleLabelEl) roleLabelEl.textContent = data.roleLabel;
      if (data.roleValue && roleValueEl) roleValueEl.textContent = data.roleValue;

      let shouldInitSlideshows = false;

      if (slideshow && Array.isArray(data.slides)) {
        slideshow.dataset.slides = JSON.stringify(data.slides);
        const firstSlide = data.slides[0] || "";
        const isVideo = isVideoSrc(firstSlide);
        if (slideshowImg[0]) {
          if (isVideo) {
            slideshowImg[0].removeAttribute("src");
          } else {
            slideshowImg[0].src = firstSlide;
          }
        }
        if (slideshowVideo) {
          if (isVideo) {
            slideshowVideo.src = firstSlide;
            slideshowVideo.classList.add("is-visible");
            slideshowImg.forEach((img) => img.classList.remove("is-visible"));
          } else {
            slideshowVideo.removeAttribute("src");
            slideshowVideo.classList.remove("is-visible");
            if (slideshowImg[0]) slideshowImg[0].classList.add("is-visible");
          }
        }
        shouldInitSlideshows = true;
      }

      if (applyTabs(data.tabs)) shouldInitSlideshows = true;

      if (shouldInitSlideshows && typeof window.initSlideshows === "function") {
        window.__deferSlideshows = false;
        window.initSlideshows();
      }
    })
    .catch(() => {});

  if (tabButtons.length && tabPanels.length) {
    const setActive = (name) => {
      tabButtons.forEach((tab) => {
        const isActive = tab.dataset.tab === name;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      tabPanels.forEach((panel) => {
        const isActive = panel.dataset.panel === name;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    };
    tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => setActive(tab.dataset.tab));
    });
  }
})();
