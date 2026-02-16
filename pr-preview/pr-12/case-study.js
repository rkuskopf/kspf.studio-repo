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
  const src = banner.dataset.case;

  if (!src) return;

  fetch(src, { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (!data) return;
      if (data.title && titleEl) titleEl.textContent = data.title;
      if (data.summary && summaryEl) summaryEl.textContent = data.summary;
      if (data.roleLabel && roleLabelEl) roleLabelEl.textContent = data.roleLabel;
      if (data.roleValue && roleValueEl) roleValueEl.textContent = data.roleValue;

      if (slideshow && Array.isArray(data.slides)) {
        slideshow.dataset.slides = JSON.stringify(data.slides);
        const firstSlide = data.slides[0] || "";
        const isVideo = /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(firstSlide || "");
        if (slideshowImg[0]) slideshowImg[0].src = isVideo ? "" : firstSlide;
        if (slideshowImg[1]) slideshowImg[1].src = "";
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
        if (typeof window.initSlideshows === "function") {
          window.__deferSlideshows = false;
          window.initSlideshows();
        }
      }
    })
    .catch(() => {});

  const tabs = document.querySelectorAll(".case-tabs__tab");
  const panels = document.querySelectorAll(".case-tabs__panel");
  if (tabs.length && panels.length) {
    const setActive = (name) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === name;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.panel === name;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    };
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setActive(tab.dataset.tab));
    });
  }
})();
