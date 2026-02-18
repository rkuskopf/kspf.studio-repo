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

  const aspectCache = new Map();

  const loadAspect = (src) =>
    new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      if (aspectCache.has(src)) {
        resolve(aspectCache.get(src));
        return;
      }
      if (isVideo(src)) {
        const probe = document.createElement("video");
        const finalize = () => {
          if (probe.videoWidth && probe.videoHeight) {
            const value = probe.videoWidth / probe.videoHeight;
            aspectCache.set(src, value);
            resolve(value);
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
          const value = probe.naturalWidth / probe.naturalHeight;
          aspectCache.set(src, value);
          resolve(value);
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

  const pickMostVisible = () => {
    if (!roots.length) return;
    const viewport = {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    let best = null;
    let bestRatio = -1;
    let bestArea = -1;

    roots.forEach((root) => {
      const rect = root.getBoundingClientRect();
      const visibleWidth = Math.max(
        0,
        Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left)
      );
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top)
      );
      const visibleArea = visibleWidth * visibleHeight;
      const totalArea = rect.width * rect.height;
      const ratio = totalArea > 0 ? visibleArea / totalArea : 0;

      if (ratio > bestRatio || (ratio === bestRatio && visibleArea > bestArea)) {
        bestRatio = ratio;
        bestArea = visibleArea;
        best = root;
      }
    });

    if (best) setActiveRoot(best);
  };

  let rafId = 0;
  const schedulePickMostVisible = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      pickMostVisible();
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
    // Active slideshow is chosen by viewport visibility, not hover/focus.

    let index = 0;
    let isInView = false;
    let currentIsVideo = false;
    let currentSrc = null;
    let hasShown = false;
    const videoPositions = new Map();
    const shouldPlay = () => isInView && activeRoot === root;
    let wasPlaying = false;

    const rememberVideoTime = () => {
      if (!currentIsVideo || !currentSrc) return;
      if (Number.isFinite(video.currentTime)) {
        videoPositions.set(currentSrc, video.currentTime);
      }
    };

    const restoreVideoTime = (src) => {
      const saved = videoPositions.get(src);
      if (!Number.isFinite(saved)) return;
      const apply = () => {
        try {
          if (Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = Math.min(saved, Math.max(0, video.duration - 0.05));
          } else {
            video.currentTime = Math.max(0, saved);
          }
        } catch {
          /* ignore seek failures */
        }
      };
      if (video.readyState >= 1) {
        apply();
      } else {
        video.addEventListener("loadedmetadata", apply, { once: true });
      }
    };

    const getVideoSrc = () => video.getAttribute("src") || "";
    const ensureVideoSrc = (src) => {
      if (getVideoSrc() !== src) {
        video.src = src;
      }
    };

    const updatePlayback = () => {
      if (!currentIsVideo) return;
      const should = shouldPlay();
      if (should) {
        ensureVideoSrc(currentSrc);
        if (!wasPlaying) {
          restoreVideoTime(currentSrc);
          video.play().catch(() => {});
        }
        wasPlaying = true;
        return;
      }
      if (wasPlaying) {
        rememberVideoTime();
        video.pause();
      }
      wasPlaying = false;
    };
    playbackUpdaters.set(root, updatePlayback);

    const updatePortraitFlag = (src) => {
      loadAspect(src).then((aspect) => {
        root.classList.toggle("is-portrait", Number.isFinite(aspect) && aspect < 1);
      });
    };

    const showImage = (src) => {
      rememberVideoTime();
      wasPlaying = false;
      currentIsVideo = false;
      currentSrc = null;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.add("is-hidden");
      img.classList.remove("is-hidden");
      img.src = src;
      updatePortraitFlag(src);
    };

    const showVideo = (src) => {
      if (currentIsVideo && currentSrc && currentSrc !== src) {
        rememberVideoTime();
      }
      currentIsVideo = true;
      currentSrc = src;
      wasPlaying = false;
      img.classList.add("is-hidden");
      video.classList.remove("is-hidden");
      if (shouldPlay()) {
        ensureVideoSrc(src);
        restoreVideoTime(src);
        video.play().catch(() => {});
        wasPlaying = true;
      } else {
        video.pause();
      }
      updatePortraitFlag(src);
    };

    const showImmediate = (nextIndex) => {
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

    const show = (nextIndex) => {
      if (!hasShown) {
        hasShown = true;
        showImmediate(nextIndex);
        return;
      }
      root.classList.add("is-transitioning");
      window.requestAnimationFrame(() => {
        showImmediate(nextIndex);
        window.requestAnimationFrame(() => {
          root.classList.remove("is-transitioning");
        });
      });
    };

    show(index);
    if (slides.length <= 1) {
      root.classList.add("is-single");
      return;
    }

    prev.addEventListener("click", () => {
      show(index - 1);
    });
    next.addEventListener("click", () => {
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

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let ignoreClick = false;

    const clearPointer = () => {
      if (pointerId === null) return;
      if (root.hasPointerCapture && root.hasPointerCapture(pointerId)) {
        root.releasePointerCapture(pointerId);
      }
      pointerId = null;
    };

    const onPointerDown = (e) => {
      if (e.pointerType !== "touch") return;
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      if (root.setPointerCapture) {
        root.setPointerCapture(pointerId);
      }
    };

    const onPointerMove = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
        e.preventDefault();
        ignoreClick = true;
        if (dx > 0) {
          show(index - 1);
        } else {
          show(index + 1);
        }
        clearPointer();
      }
    };

    const onPointerEnd = (e) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      clearPointer();
    };

    const onClickCapture = (e) => {
      if (!ignoreClick) return;
      ignoreClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove, { passive: false });
    root.addEventListener("pointerup", onPointerEnd);
    root.addEventListener("pointercancel", onPointerEnd);
    root.addEventListener("click", onClickCapture, true);

    preload(slides[(index + 1) % slides.length]);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target !== root) return;
          isInView = entry.isIntersecting;
          updatePlayback();
          schedulePickMostVisible();
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
  if (!window.__deferSlideshows) {
    setupSlideshows();
  }

  window.addEventListener("scroll", schedulePickMostVisible, { passive: true });
  window.addEventListener("resize", schedulePickMostVisible);
  schedulePickMostVisible();
})();
