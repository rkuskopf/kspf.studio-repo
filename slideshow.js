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

    const transitionDuration = 400;

    const cloneMedia = (el, extraClass) => {
      const clone = el.cloneNode(false);
      clone.removeAttribute("id");
      clone.classList.remove("is-visible");
      clone.classList.add("is-hidden");
      if (extraClass) clone.classList.add(extraClass);
      clone.setAttribute("aria-hidden", "true");
      clone.dataset.slideshowClone = "1";
      return clone;
    };

    const imgAlt = cloneMedia(img, "hero__img--alt");
    img.insertAdjacentElement("afterend", imgAlt);

    const videoAlt = cloneMedia(video, "hero__video--alt");
    videoAlt.removeAttribute("src");
    video.insertAdjacentElement("afterend", videoAlt);

    const imageSlots = [img, imgAlt];
    const videoSlots = [video, videoAlt];
    const allMedia = [...imageSlots, ...videoSlots];
    const previewImageSrc = root.dataset.previewImageSrc || "";

    allMedia.forEach((media) => {
      media.classList.add("is-hidden");
      media.classList.remove("is-active");
      media.setAttribute("aria-hidden", "true");
    });

    const slides = parseSlides(root.dataset.slides).filter(Boolean);
    setHeroAspect(root, slides, img.getAttribute("src"));
    // Active slideshow is chosen by viewport visibility, not hover/focus.

    let index = 0;
    let isInView = false;
    let currentIsVideo = false;
    let currentSrc = null;
    let hasShown = false;
    let activeMediaEl = null;
    let activeImageEl = imageSlots[0];
    let activeVideoEl = videoSlots[0];
    const videoPositions = new Map();
    const shouldPlay = () => isInView && activeRoot === root;
    let wasPlaying = false;
    let playingVideoEl = null;

    const pauseVideo = (el) => {
      if (!el) return;
      try {
        el.pause();
      } catch {
        /* ignore pause failures */
      }
    };

    const rememberVideoTime = (el, src) => {
      if (!el || !src) return;
      if (Number.isFinite(el.currentTime)) {
        videoPositions.set(src, el.currentTime);
      }
    };

    const restoreVideoTime = (el, src) => {
      const saved = videoPositions.get(src);
      if (!Number.isFinite(saved)) return;
      const apply = () => {
        try {
          if (Number.isFinite(el.duration) && el.duration > 0) {
            el.currentTime = Math.min(saved, Math.max(0, el.duration - 0.05));
          } else {
            el.currentTime = Math.max(0, saved);
          }
        } catch {
          /* ignore seek failures */
        }
      };
      if (el.readyState >= 1) {
        apply();
      } else {
        el.addEventListener("loadedmetadata", apply, { once: true });
      }
    };

    const getVideoSrc = (el) => el.getAttribute("src") || "";
    const ensureVideoSrc = (el, src) => {
      if (getVideoSrc(el) !== src) {
        el.src = src;
      }
    };

    const clearVideoSrc = (el) => {
      if (!el) return;
      el.removeAttribute("src");
      el.load();
    };

    const updatePlayback = () => {
      if (!currentIsVideo || !currentSrc || !activeVideoEl) {
        videoSlots.forEach(pauseVideo);
        wasPlaying = false;
        playingVideoEl = null;
        return;
      }
      const should = shouldPlay();
      if (should) {
        ensureVideoSrc(activeVideoEl, currentSrc);
        if (!wasPlaying || playingVideoEl !== activeVideoEl) {
          restoreVideoTime(activeVideoEl, currentSrc);
          activeVideoEl.play().catch(() => {});
        }
        wasPlaying = true;
        playingVideoEl = activeVideoEl;
        return;
      }
      if (wasPlaying && playingVideoEl) {
        rememberVideoTime(playingVideoEl, currentSrc);
        pauseVideo(playingVideoEl);
      }
      wasPlaying = false;
      playingVideoEl = null;
    };
    playbackUpdaters.set(root, updatePlayback);

    const updatePortraitFlag = (src) => {
      loadAspect(src).then((aspect) => {
        root.classList.toggle("is-portrait", Number.isFinite(aspect) && aspect < 1);
      });
    };

    const hideMedia = (el) => {
      if (!el) return;
      el.classList.add("is-hidden");
      el.classList.remove("is-active");
      el.setAttribute("aria-hidden", "true");
    };

    const showMedia = (el, immediate = false) => {
      if (!el) return;
      el.classList.add("is-active");
      el.setAttribute("aria-hidden", "false");
      if (immediate) {
        el.classList.remove("is-hidden");
        return;
      }
      el.classList.add("is-hidden");
      window.requestAnimationFrame(() => {
        el.classList.remove("is-hidden");
      });
    };

    const hideAllExcept = (el) => {
      allMedia.forEach((media) => {
        if (media !== el) hideMedia(media);
      });
    };

    const setActiveMedia = (el, immediate = false) => {
      hideAllExcept(el);
      showMedia(el, immediate);
      activeMediaEl = el;
    };

    const scheduleVideoCleanup = () => {
      window.setTimeout(() => {
        videoSlots.forEach((vid) => {
          if (currentIsVideo && vid === activeVideoEl) return;
          if (!vid.classList.contains("is-hidden")) return;
          if (vid.getAttribute("src")) {
            clearVideoSrc(vid);
          }
        });
      }, transitionDuration + 20);
    };

    const showImage = (src, immediate = false) => {
      if (currentIsVideo && currentSrc && activeVideoEl) {
        rememberVideoTime(activeVideoEl, currentSrc);
      }
      currentIsVideo = false;
      currentSrc = null;
      wasPlaying = false;
      playingVideoEl = null;

      const nextImageEl = activeImageEl === imageSlots[0] ? imageSlots[1] : imageSlots[0];
      activeImageEl = nextImageEl;
      nextImageEl.src = src;

      videoSlots.forEach(pauseVideo);
      setActiveMedia(nextImageEl, immediate);
      scheduleVideoCleanup();
      updatePortraitFlag(src);
    };

    const showVideo = (src, immediate = false) => {
      if (currentIsVideo && currentSrc && currentSrc !== src && activeVideoEl) {
        rememberVideoTime(activeVideoEl, currentSrc);
      }
      currentIsVideo = true;
      currentSrc = src;
      wasPlaying = false;
      playingVideoEl = null;

      const nextVideoEl = activeVideoEl === videoSlots[0] ? videoSlots[1] : videoSlots[0];
      activeVideoEl = nextVideoEl;
      ensureVideoSrc(nextVideoEl, src);

      if (shouldPlay()) {
        restoreVideoTime(nextVideoEl, src);
        nextVideoEl.play().catch(() => {});
        wasPlaying = true;
        playingVideoEl = nextVideoEl;
      } else {
        pauseVideo(nextVideoEl);
      }

      videoSlots.forEach((vid) => {
        if (vid !== nextVideoEl) pauseVideo(vid);
      });

      const revealVideo = () => {
        if (currentSrc !== src || activeVideoEl !== nextVideoEl) return;
        setActiveMedia(nextVideoEl, immediate);
        scheduleVideoCleanup();
        updatePortraitFlag(src);
      };

      const keepPreviewVisible =
        immediate &&
        activeMediaEl &&
        activeMediaEl.tagName === "IMG" &&
        nextVideoEl.readyState < 2;

      if (keepPreviewVisible) {
        const onReady = () => {
          nextVideoEl.removeEventListener("loadeddata", onReady);
          nextVideoEl.removeEventListener("error", onReady);
          revealVideo();
        };
        nextVideoEl.addEventListener("loadeddata", onReady, { once: true });
        nextVideoEl.addEventListener("error", onReady, { once: true });
        updatePortraitFlag(activeMediaEl.getAttribute("src") || src);
        return;
      }

      revealVideo();
    };

    const applySlide = (nextIndex, immediate = false) => {
      index = (nextIndex + slides.length) % slides.length;
      const current = slides[index];
      if (isVideo(current)) {
        showVideo(current, immediate);
      } else {
        showImage(current, immediate);
      }
      preload(slides[(index + 1) % slides.length]);
      preload(slides[(index - 1 + slides.length) % slides.length]);
    };

    const showImmediate = (nextIndex) => {
      applySlide(nextIndex, true);
    };

    const show = (nextIndex) => {
      if (!hasShown) {
        hasShown = true;
        showImmediate(nextIndex);
        return;
      }
      root.classList.add("is-transitioning");
      applySlide(nextIndex);
      window.setTimeout(() => {
        root.classList.remove("is-transitioning");
      }, transitionDuration);
    };

    if (previewImageSrc && slides.length && isVideo(slides[0])) {
      activeImageEl.src = previewImageSrc;
      setActiveMedia(activeImageEl, true);
      updatePortraitFlag(previewImageSrc);
    }

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
