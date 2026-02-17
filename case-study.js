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
  const setActive = (name) => {
    if (!tabButtons.length || !tabPanels.length) return;
    tabButtons.forEach((tab) => {
      if (tab.dataset.tab !== name) {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
        return;
      }
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
    });
    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.panel === name;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };
  const scheduleTabsMinHeight = (() => {
    let raf = 0;
    return () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        let maxHeight = 0;
        tabPanels.forEach((panel) => {
          if (panel.dataset.disabled === "1") return;
          const wasHidden = panel.hidden;
          const wasActive = panel.classList.contains("is-active");
          const prevDisplay = panel.style.display;
          const prevPosition = panel.style.position;
          const prevVisibility = panel.style.visibility;
          const prevPointerEvents = panel.style.pointerEvents;
          const prevLeft = panel.style.left;
          const prevTop = panel.style.top;
          const prevWidth = panel.style.width;

          panel.hidden = false;
          panel.classList.add("is-active");
          panel.style.display = "block";
          panel.style.position = "absolute";
          panel.style.visibility = "hidden";
          panel.style.pointerEvents = "none";
          panel.style.left = "0";
          panel.style.top = "0";
          panel.style.width = panel.parentElement ? `${panel.parentElement.clientWidth}px` : "100%";

          const height = panel.getBoundingClientRect().height;
          if (height > maxHeight) maxHeight = height;

          panel.style.display = prevDisplay;
          panel.style.position = prevPosition;
          panel.style.visibility = prevVisibility;
          panel.style.pointerEvents = prevPointerEvents;
          panel.style.left = prevLeft;
          panel.style.top = prevTop;
          panel.style.width = prevWidth;
          if (!wasActive) panel.classList.remove("is-active");
          panel.hidden = wasHidden;
        });

        if (maxHeight > 0) {
          const value = `${Math.ceil(maxHeight)}px`;
          tabPanels.forEach((panel) => {
            panel.style.minHeight = value;
          });
        }
      });
    };
  })();
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

    let activeKey = "";
    tabButtons.forEach((tabButton) => {
      if (tabButton.classList.contains("is-active")) {
        activeKey = tabButton.dataset.tab || "";
      }
    });

    const availableKeys = [];
    tabButtons.forEach((tabButton, index) => {
      const key = tabButton.dataset.tab || "";
      const tabData = byKey.get(key) || list[index];
      const panel = document.querySelector(`.case-tabs__panel[data-panel="${key}"]`);
      if (!tabData) {
        tabButton.hidden = true;
        tabButton.setAttribute("aria-hidden", "true");
        tabButton.classList.remove("is-active");
        tabButton.setAttribute("aria-selected", "false");
        if (panel) {
          panel.hidden = true;
          panel.classList.remove("is-active");
          panel.dataset.disabled = "1";
        }
        return;
      }

      tabButton.hidden = false;
      tabButton.removeAttribute("aria-hidden");
      if (panel) panel.dataset.disabled = "0";
      availableKeys.push(key);

      if (tabData.label) tabButton.textContent = tabData.label;

      if (!panel) return;

      const layout = tabData.layout === "list" ? "list" : "media";
      panel.classList.toggle("is-list", layout === "list");

      const subtitleEl = panel.querySelector(".case-tabs__subtitle");
      if (subtitleEl && Object.prototype.hasOwnProperty.call(tabData, "subtitle")) {
        subtitleEl.textContent = tabData.subtitle || "";
      }

      const bodyEl = panel.querySelector(".case-tabs__text p");
      if (bodyEl && Object.prototype.hasOwnProperty.call(tabData, "body")) {
        bodyEl.textContent = tabData.body || "";
      }

      const listEl = panel.querySelector(".case-tabs__list");
      if (listEl) {
        listEl.innerHTML = "";
        if (layout === "list" && Array.isArray(tabData.items)) {
          tabData.items.forEach((item) => {
            if (!item) return;
            const li = document.createElement("li");
            li.className = "case-tabs__item";

            if (item.title) {
              const title = document.createElement("h4");
              title.className = "case-tabs__item-title";
              title.textContent = item.title;
              li.appendChild(title);
            }

            if (item.description) {
              const desc = document.createElement("p");
              desc.className = "case-tabs__item-desc";
              desc.textContent = item.description;
              li.appendChild(desc);
            }

            if (li.childElementCount) listEl.appendChild(li);
          });
        }
      }

      const mediaEl = panel.querySelector(".case-tabs__media");
      if (mediaEl) {
        mediaEl.innerHTML = "";
        if (layout !== "list" && Array.isArray(tabData.slides)) {
          const slideshowEl = buildTabSlideshow(tabData.slides, tabData.label || tabData.subtitle);
          if (slideshowEl) mediaEl.appendChild(slideshowEl);
        }
      }
    });

    if (!activeKey || !availableKeys.includes(activeKey)) {
      if (availableKeys.length) setActive(availableKeys[0]);
    }

    scheduleTabsMinHeight();
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
      scheduleTabsMinHeight();

      if (shouldInitSlideshows && typeof window.initSlideshows === "function") {
        window.__deferSlideshows = false;
        window.initSlideshows();
      }
    })
    .catch(() => {});

  if (tabButtons.length && tabPanels.length) {
    scheduleTabsMinHeight();
    window.addEventListener("resize", scheduleTabsMinHeight);
    window.addEventListener("load", scheduleTabsMinHeight);
    tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => setActive(tab.dataset.tab));
    });
  }
})();
