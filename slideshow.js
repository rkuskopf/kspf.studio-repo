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

  const videoExtensions = new Set(["mp4", "mov", "webm", "m4v"]);

  const isVideo = (src) => {
    if (!src) return false;
    const clean = src.split("?")[0];
    const ext = clean.slice(clean.lastIndexOf(".") + 1).toLowerCase();
    return videoExtensions.has(ext);
  };

  const preload = (src) => {
    if (!src || isVideo(src)) return;
    const img = new Image();
    img.src = src;
  };

  const playbackUpdaters = new Map();

  const setActiveRoot = (root) => {
    if (activeRoot === root) return;
    const previous = activeRoot;
    if (activeRoot) activeRoot.classList.remove("is-active");
    activeRoot = root;
    if (activeRoot) activeRoot.classList.add("is-active");
    if (previous && playbackUpdaters.has(previous)) playbackUpdaters.get(previous)();
    if (activeRoot && playbackUpdaters.has(activeRoot)) playbackUpdaters.get(activeRoot)();
  };

  const loadAspect = (src) =>
    new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      if (isVideo(src)) {
        const probe = document.createElement("video");
        const finalize = () => {
          if (probe.videoWidth && probe.videoHeight) {
            resolve(probe.videoWidth / probe.videoHeight);
          } else {
            resolve(null);
          }
        };
        probe.onloadedmetadata = finalize;
        probe.onerror = () => resolve(null);
        probe.src = src;
        return;
      }
      const probe = new Image();
      const finalize = () => {
        if (probe.naturalWidth && probe.naturalHeight) {
          resolve(probe.naturalWidth / probe.naturalHeight);
        } else {
          resolve(null);
        }
      };
      probe.onload = finalize;
      probe.onerror = () => resolve(null);
      probe.src = src;
      if (probe.complete) finalize();
    });

  const setHeroAspect = (root, slides, fallbackSrc) => {
    const sources = (slides && slides.length ? slides : [fallbackSrc]).filter(Boolean);
    if (!sources.length) return;
    const unique = Array.from(new Set(sources));
    Promise.all(unique.map(loadAspect)).then((aspects) => {
      const maxAspect = Math.max(...aspects.filter(Boolean));
      if (!Number.isFinite(maxAspect) || maxAspect <= 0) return;
      const value = maxAspect.toFixed(4);
      root.style.setProperty("--hero-aspect", value);
      const doc = document.documentElement;
      if (!doc.dataset.navHeroAspect) {
        doc.style.setProperty("--nav-hero-aspect", value);
        doc.dataset.navHeroAspect = "1";
      }
    });
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
    const video = root.querySelector(".hero__video");
    const prev = root.querySelector(".hero__hit--prev");
    const next = root.querySelector(".hero__hit--next");
    if (!img || !video || !prev || !next) return;

    const slides = parseSlides(root.dataset.slides).filter(Boolean);
    setHeroAspect(root, slides, img.getAttribute("src"));
    root.addEventListener("pointerenter", () => setActiveRoot(root));
    root.addEventListener("focusin", () => setActiveRoot(root));

    let index = 0;
    let isInView = false;
    let currentIsVideo = false;
    let currentSrc = null;
    const shouldPlay = () => isInView && activeRoot === root;

    const updatePlayback = () => {
      if (!currentIsVideo) return;
      if (shouldPlay()) {
        if (video.src !== currentSrc) {
          video.src = currentSrc;
        }
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    playbackUpdaters.set(root, updatePlayback);

    const showImage = (src) => {
      currentIsVideo = false;
      currentSrc = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.add("is-hidden");
      img.classList.remove("is-hidden");
      img.src = src;
    };

    const showVideo = (src) => {
      currentIsVideo = true;
      currentSrc = src;
      img.classList.add("is-hidden");
      video.classList.remove("is-hidden");
      if (shouldPlay()) {
        if (video.src !== src) {
          video.src = src;
        }
        video.play().catch(() => {});
      } else {
        video.pause();
        if (video.src) {
          video.removeAttribute("src");
          video.load();
        }
      }
    };

    const show = (nextIndex) => {
      index = (nextIndex + slides.length) % slides.length;
      const current = slides[index];
      if (isVideo(current)) {
        showVideo(current);
      } else {
        showImage(current);
      }
      preload(slides[(index + 1) % slides.length]);
      preload(slides[(index - 1 + slides.length) % slides.length]);
    };

    show(index);
    if (slides.length <= 1) {
      root.classList.add("is-single");
      return;
    }

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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target !== root) return;
          isInView = entry.isIntersecting;
          updatePlayback();
        });
      },
      { root: null, threshold: 0.35 }
    );
    observer.observe(root);
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
