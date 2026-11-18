(() => {
  let activeRoot = null;

  const setMediaPortraitClass = (media, aspect) => {
    const isPortrait = Number.isFinite(aspect) && aspect < 1;
    media.classList.toggle("is-portrait", isPortrait);
    media.classList.remove("is-orientation-pending");
    return isPortrait;
  };

  const createMediaPortraitUpdater = (loadMediaAspect) => (media, src) => {
    media.classList.add("is-orientation-pending");
    return loadMediaAspect(src).then((aspect) => {
      setMediaPortraitClass(media, aspect);
      return aspect;
    });
  };

  const getFrameAspects = (aspects) => {
    const valid = aspects.filter((aspect) => Number.isFinite(aspect) && aspect > 0);
    const landscape = valid.filter((aspect) => aspect >= 1);
    return {
      desktop: valid.length ? Math.max(...valid) : null,
      mobileLandscape: landscape.length ? Math.min(...landscape) : null,
      hasPortrait: valid.some((aspect) => aspect < 1),
    };
  };

  const positionHitArea = (root, media, previous, next) => {
    if (!root || !media || !previous || !next) return;
    const rootRect = root.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    if (mediaRect.width <= 0 || mediaRect.height <= 0) return;

    const top = mediaRect.top - rootRect.top;
    const homepage = document.body?.dataset.page === "home";
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const left = homepage ? -rootRect.left : mediaRect.left - rootRect.left;
    const halfWidth = (homepage ? viewportWidth : mediaRect.width) / 2;
    let hitLeft = homepage ? 0 : mediaRect.left;
    let hitRight = homepage ? viewportWidth : mediaRect.left + mediaRect.width;
    let hitBottom = mediaRect.top + mediaRect.height;
    if (homepage) {
      const labels = root.closest?.(".project-block")?.querySelectorAll(".project__name, .project__category") ?? [];
      const mediaRight = mediaRect.left + mediaRect.width;
      for (const label of labels) {
        const rect = label.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.bottom <= mediaRect.top || rect.top >= hitBottom + 8) continue;
        if (rect.right <= mediaRect.left) {
          hitLeft = Math.max(hitLeft, rect.right + 8);
        } else if (rect.left >= mediaRight) {
          hitRight = Math.min(hitRight, rect.left - 8);
        } else if (rect.top > mediaRect.top) {
          hitBottom = Math.min(hitBottom, rect.top - 8);
        }
      }
    }
    const shared = {
      bottom: "auto",
      height: `${Math.max(0, hitBottom - mediaRect.top)}px`,
      right: "auto",
      top: `${top}px`,
      width: `${halfWidth}px`,
    };

    [previous, next].forEach((control) => {
      Object.entries(shared).forEach(([name, value]) => control.style.setProperty(name, value));
    });
    const midpoint = rootRect.left + left + halfWidth;
    previous.style.setProperty("left", `${hitLeft - rootRect.left}px`);
    previous.style.setProperty("width", `${Math.max(0, midpoint - hitLeft)}px`);
    next.style.setProperty("left", `${left + halfWidth}px`);
    next.style.setProperty("width", `${Math.max(0, hitRight - midpoint)}px`);
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createMediaPortraitUpdater,
      getFrameAspects,
      positionHitArea,
      setMediaPortraitClass,
    };
  }

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

  const updateProjectMetadataWidth = (block) => {
    if (!block) return;
    const number = block.querySelector(".project__number");
    const category = block.querySelector(".project__category");
    const width = Math.max(
      number ? number.getBoundingClientRect().width : 0,
      category ? category.getBoundingClientRect().width : 0
    );
    if (width > 0) {
      block.style.setProperty("--project-meta-width", `${Math.ceil(width)}px`);
    }
  };

  const metadataObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver((entries) => {
      const blocks = new Set(
        entries.map((entry) => entry.target.closest(".project-block")).filter(Boolean)
      );
      blocks.forEach(updateProjectMetadataWidth);
    })
    : null;

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
    if (root.dataset.frameReserved === "1") return;
    const sources = (slides && slides.length ? slides : [fallbackSrc]).filter(Boolean);
    if (!sources.length) return;
    const unique = Array.from(new Set(sources));
    Promise.all(unique.map(loadAspect)).then((aspects) => {
      const frameAspects = getFrameAspects(aspects);
      if (!frameAspects.desktop) return;
      const value = frameAspects.desktop.toFixed(4);
      root.style.setProperty("--hero-aspect", value);
      if (frameAspects.mobileLandscape) {
        root.style.setProperty(
          "--hero-mobile-landscape-aspect",
          frameAspects.mobileLandscape.toFixed(4)
        );
      }
      root.classList.toggle("has-portrait", frameAspects.hasPortrait);
      const projectBlock = root.closest(".project-block");
      if (projectBlock) {
        projectBlock.style.setProperty("--hero-aspect", value);
        if (frameAspects.mobileLandscape) {
          projectBlock.style.setProperty(
            "--hero-mobile-landscape-aspect",
            frameAspects.mobileLandscape.toFixed(4)
          );
        }
      }
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

    setActiveRoot(bestArea > 0 ? best : null);
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

    const projectBlock = root.closest(".project-block");
    if (projectBlock) {
      updateProjectMetadataWidth(projectBlock);
      if (metadataObserver) {
        projectBlock.querySelectorAll(".project__number, .project__category")
          .forEach((meta) => metadataObserver.observe(meta));
      }
    }

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
    // cloneNode does not preserve the video element's runtime muted state.
    videoAlt.defaultMuted = video.defaultMuted || video.muted;
    videoAlt.muted = video.muted;
    video.insertAdjacentElement("afterend", videoAlt);

    const imageSlots = [img, imgAlt];
    const videoSlots = [video, videoAlt];
    const allMedia = [...imageSlots, ...videoSlots];

    allMedia.forEach((media) => {
      media.classList.add("is-hidden");
      media.classList.remove("is-active");
      media.setAttribute("aria-hidden", "true");
    });

    const slides = parseSlides(root.dataset.slides).filter(Boolean);
    setHeroAspect(root, slides, img.getAttribute("src"));
    const reserved = root.dataset.frameReserved === "1";
    const layout = window.kspfMediaLayout;
    const poster = root.querySelector(".hero__poster");
    const status = root.querySelector(".hero__status");
    const playButton = reserved ? document.createElement("button") : null;
    if (playButton) {
      playButton.className = "hero__play";
      playButton.type = "button";
      playButton.textContent = "Play video";
      playButton.hidden = true;
      root.append(playButton);
    }
    // Active slideshow is chosen by viewport visibility, not hover/focus.

    let index = 0;
    let isInView = false;
    let currentIsVideo = false;
    let currentSrc = null;
    let hasShown = false;
    let activeMediaEl = null;
    let pendingMediaEl = null;
    let activeImageEl = imageSlots[0];
    let activeVideoEl = videoSlots[0];
    const videoPositions = new Map();
    const shouldPlay = () => isInView && activeRoot === root;
    let wasPlaying = false;
    let playingVideoEl = null;
    let mediaFailed = false;
    const setStatus = (text) => {
      if (!status) return;
      status.textContent = text;
      status.hidden = !text;
    };
    const playVideo = (el) => {
      el.play().catch((error) => {
        // Pausing an offscreen/outgoing video deliberately aborts play().
        if (error?.name === "AbortError" || !currentIsVideo || el !== activeVideoEl || mediaFailed) return;
        wasPlaying = false;
        if (playButton) playButton.hidden = false;
        setStatus("");
      });
    };
    playButton?.addEventListener("click", () => {
      if (activeVideoEl) playVideo(activeVideoEl);
    });
    let hitAreaRafId = 0;
    const updateHitArea = () => {
      hitAreaRafId = 0;
      positionHitArea(root, activeMediaEl, prev, next);
    };
    const scheduleHitArea = () => {
      if (hitAreaRafId) return;
      hitAreaRafId = window.requestAnimationFrame(updateHitArea);
    };

    allMedia.forEach((media) => {
      media.addEventListener("load", scheduleHitArea);
      media.addEventListener("loadedmetadata", scheduleHitArea);
      if (!reserved) return;
      const ready = (event) => {
        if (pendingMediaEl && media !== pendingMediaEl) return;
        // Keep the outgoing frame in place until the next image is decoded or
        // video actually starts. Metadata/data readiness alone can flash black.
        if (media === pendingMediaEl) {
          if (media.tagName === "VIDEO" && event.type !== "playing") return;
          presentMedia(media);
        }
        if (media !== activeMediaEl) return;
        if (media.tagName === "VIDEO" && event.type !== "playing") return;
        mediaFailed = false;
        root.classList.remove("is-media-failed");
        media.classList.remove("is-orientation-pending");
        setStatus("");
        if (poster) poster.hidden = true;
        if (playButton && (media.tagName !== "VIDEO" || event.type === "playing")) playButton.hidden = true;
      };
      media.addEventListener(media.tagName === "VIDEO" ? "loadeddata" : "load", ready);
      media.addEventListener("playing", ready);
      media.addEventListener("error", () => {
        if (media !== activeMediaEl && media !== pendingMediaEl) return;
        mediaFailed = true;
        root.classList.add("is-media-failed");
        setStatus("Media unavailable. Try another slide.");
        if (playButton) playButton.hidden = true;
      });
    });
    poster?.addEventListener("load", () => {
      if (currentIsVideo && !poster.hidden && !mediaFailed) setStatus("");
    });
    poster?.addEventListener("error", () => {
      poster.hidden = true;
      if (currentIsVideo && !mediaFailed) setStatus("");
    });
    window.addEventListener("resize", scheduleHitArea);

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
          playVideo(activeVideoEl);
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

    const updateMediaPortrait = createMediaPortraitUpdater(loadAspect);
    const updatePortraitFlag = (media, src) => {
      if (reserved) {
        const known = layout?.aspect(src);
        setMediaPortraitClass(media, known);
        // Use the rendered element's metadata, never a second network probe.
        // Unknown frame geometry stays reserved even after classification.
        if (!known) {
          const event = media.tagName === "VIDEO" ? "loadedmetadata" : "load";
          media.addEventListener(event, () => {
            if (media.dataset.source !== src) return;
            const width = media.videoWidth || media.naturalWidth;
            const height = media.videoHeight || media.naturalHeight;
            setMediaPortraitClass(media, height ? width / height : null);
            scheduleHitArea();
          }, { once: true });
        }
        media.dataset.source = src;
        return Promise.resolve(known);
      }
      const cachedAspect = aspectCache.get(src);
      if (Number.isFinite(cachedAspect)) {
        setMediaPortraitClass(media, cachedAspect);
        return Promise.resolve(cachedAspect);
      }
      return updateMediaPortrait(media, src);
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
      scheduleHitArea();
    };

    const presentMedia = (el, immediate = false) => {
      pendingMediaEl = null;
      if (reserved && activeMediaEl && activeMediaEl !== el) {
        if (poster) poster.hidden = true;
        root.classList.add("is-transitioning");
        setActiveMedia(el);
        window.setTimeout(() => root.classList.remove("is-transitioning"), transitionDuration);
      } else setActiveMedia(el, immediate);
      scheduleVideoCleanup();
    };

    const stageMedia = (el, immediate) => {
      if (!reserved || !activeMediaEl || activeMediaEl === el) {
        presentMedia(el, immediate);
        return;
      }
      pendingMediaEl = el;
      hideMedia(el);
      if (el.tagName === "IMG" && el.complete && el.naturalWidth) presentMedia(el, immediate);
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

      const nextImageEl = reserved ? imageSlots.find(media => media !== activeMediaEl)
        : activeImageEl === imageSlots[0] ? imageSlots[1] : imageSlots[0];
      activeImageEl = nextImageEl;
      nextImageEl.loading = "eager";
      nextImageEl.fetchPriority = root.dataset.priority || "auto";
      nextImageEl.src = reserved ? layout?.image(src) || src : src;
      updatePortraitFlag(nextImageEl, src).then(scheduleHitArea);

      videoSlots.forEach(pauseVideo);
      stageMedia(nextImageEl, immediate);
      scheduleVideoCleanup();
    };

    const showVideo = (src, immediate = false) => {
      if (currentIsVideo && currentSrc && currentSrc !== src && activeVideoEl) {
        rememberVideoTime(activeVideoEl, currentSrc);
      }
      currentIsVideo = true;
      currentSrc = src;
      wasPlaying = false;
      playingVideoEl = null;

      const nextVideoEl = reserved ? videoSlots.find(media => media !== activeMediaEl)
        : activeVideoEl === videoSlots[0] ? videoSlots[1] : videoSlots[0];
      activeVideoEl = nextVideoEl;
      ensureVideoSrc(nextVideoEl, src);
      updatePortraitFlag(nextVideoEl, src).then(scheduleHitArea);

      if (shouldPlay()) {
        restoreVideoTime(nextVideoEl, src);
        playVideo(nextVideoEl);
        wasPlaying = true;
        playingVideoEl = nextVideoEl;
      } else {
        pauseVideo(nextVideoEl);
      }

      videoSlots.forEach((vid) => {
        if (vid !== nextVideoEl) pauseVideo(vid);
      });

      stageMedia(nextVideoEl, immediate);
      scheduleVideoCleanup();
    };

    const applySlide = (nextIndex, immediate = false) => {
      index = (nextIndex + slides.length) % slides.length;
      const counter = root.closest(".project-block")?.querySelector(".project__slide-counter");
      if (counter) {
        counter.querySelector(".project__slide-current").textContent = String(index + 1).padStart(3, "0");
        counter.setAttribute("aria-label", `Slide ${index + 1} of ${slides.length}`);
      }
      const current = slides[index];
      if (reserved) {
        mediaFailed = false;
        root.classList.remove("is-media-failed");
        setStatus("");
        playButton.hidden = true;
        const posterSrc = isVideo(current) && layout?.poster(current);
        if (poster && !activeMediaEl) {
          poster.hidden = !posterSrc;
          if (posterSrc) {
            poster.classList.toggle("is-portrait", layout.aspect(current) < 1);
            if (poster.getAttribute("src") !== posterSrc) poster.src = posterSrc;
            if (poster.complete && poster.naturalWidth) setStatus("");
          }
        }
      }
      if (isVideo(current)) {
        showVideo(current, immediate);
      } else {
        showImage(current, immediate);
      }
      if (!reserved) {
        preload(slides[(index + 1) % slides.length]);
        preload(slides[(index - 1 + slides.length) % slides.length]);
      }
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
      if (reserved) {
        applySlide(nextIndex);
        return;
      }
      root.classList.add("is-transitioning");
      applySlide(nextIndex);
      window.setTimeout(() => {
        root.classList.remove("is-transitioning");
      }, transitionDuration);
    };

    if (!slides.length) {
      root.classList.add("is-single");
      setStatus("Media unavailable.");
      return;
    }
    show(index);
    if (slides.length <= 1) {
      root.classList.add("is-single");
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

    if (!reserved) preload(slides[(index + 1) % slides.length]);

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

  const lazyObserver = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      lazyObserver.unobserve(entry.target);
      initSlideshow(entry.target);
      schedulePickMostVisible();
    }
  }, { rootMargin: "200px 0px" }) : null;

  const setupSlideshows = (scope = document) => {
    scope.querySelectorAll(".js-slideshow").forEach(root => {
      if (root.dataset.frameReserved === "1" && root.dataset.priority !== "high" && lazyObserver) {
        lazyObserver.observe(root);
      } else initSlideshow(root);
    });
  };

  window.initSlideshows = setupSlideshows;
  if (!window.__deferSlideshows) {
    setupSlideshows();
  }

  window.addEventListener("scroll", schedulePickMostVisible, { passive: true });
  window.addEventListener("resize", schedulePickMostVisible);
  schedulePickMostVisible();
})();
