(() => {
  let activeRoot = null;

  const parseSlides = (raw) => {
    if (!raw) return [];
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const preload = (src) => {
    if (!src) return;
    const img = new Image();
    img.src = src;
  };

  const setActiveRoot = (root) => {
    if (activeRoot === root) return;
    if (activeRoot) activeRoot.classList.remove("is-active");
    activeRoot = root;
    if (activeRoot) activeRoot.classList.add("is-active");
  };

  const roots = [];

  const pickClosestToCenter = () => {
    if (!roots.length) return;
    const centerY = window.innerHeight / 2;
    let closest = roots[0];
    let bestDistance = Infinity;

    roots.forEach((root) => {
      const rect = root.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        closest = root;
      }
    });

    setActiveRoot(closest);
  };

  let rafId = 0;
  const schedulePickClosest = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      pickClosestToCenter();
    });
  };

  const initSlideshow = (root) => {
    if (root.dataset.slideshowInit === "1") return;
    root.dataset.slideshowInit = "1";
    roots.push(root);

    const img = root.querySelector(".hero__img");
    const prev = root.querySelector(".hero__hit--prev");
    const next = root.querySelector(".hero__hit--next");
    if (!img || !prev || !next) return;

    const slides = parseSlides(root.dataset.slides).filter(Boolean);
    if (slides.length <= 1) {
      root.classList.add("is-single");
      return;
    }

    root.addEventListener("pointerenter", () => setActiveRoot(root));
    root.addEventListener("focusin", () => setActiveRoot(root));

    const initialSrc = img.getAttribute("src");
    let index = slides.indexOf(initialSrc);
    if (index < 0) index = 0;

    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      img.src = slides[index];
      preload(slides[(index + 1) % slides.length]);
      preload(slides[(index - 1 + slides.length) % slides.length]);
    };

    prev.addEventListener("click", () => {
      setActiveRoot(root);
      show(index - 1);
    });
    next.addEventListener("click", () => {
      setActiveRoot(root);
      show(index + 1);
    });

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        show(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        show(index + 1);
      }
    });

    preload(slides[(index + 1) % slides.length]);
  };

  const setupSlideshows = (scope = document) => {
    scope.querySelectorAll(".js-slideshow").forEach(initSlideshow);
  };

  window.initSlideshows = setupSlideshows;
  setupSlideshows();

  window.addEventListener("scroll", schedulePickClosest, { passive: true });
  window.addEventListener("resize", schedulePickClosest);
  schedulePickClosest();
})();
