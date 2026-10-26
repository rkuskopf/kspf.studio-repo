(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const forceMotion = document.documentElement.hasAttribute("data-force-scroll");
  const SCROLL_MIN_DURATION = 1400;
  const SCROLL_MAX_DURATION = 2600;
  const SCROLL_MS_PER_PX = 0.6;

  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const getTargetFromHash = (hash) => {
    if (!hash || hash === "#") return null;
    return document.getElementById(hash.slice(1));
  };

  const setHash = (hash) => {
    if (!hash || hash === "#") return;
    history.pushState(null, "", hash);
  };

  const getDuration = (distance) => {
    const absDistance = Math.abs(distance);
    const scaled = absDistance * SCROLL_MS_PER_PX;
    return Math.min(SCROLL_MAX_DURATION, Math.max(SCROLL_MIN_DURATION, scaled));
  };

  const getAnchorFromEvent = (event) => {
    const path = event.composedPath ? event.composedPath() : [event.target];
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.matches && node.matches('a[href^="#"]')) return node;
      if (node.closest) {
        const found = node.closest('a[href^="#"]');
        if (found) return found;
      }
    }
    return null;
  };

  const onClick = (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = getAnchorFromEvent(event);
    if (!link) return;
    const hash = link.hash;
    const target = getTargetFromHash(hash);
    if (!target) return;

    event.preventDefault();

    if (prefersReducedMotion && !forceMotion) {
      target.scrollIntoView();
      setHash(hash);
      return;
    }

    const startY = window.pageYOffset;
    const targetY = target.getBoundingClientRect().top + startY;
    const doc = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(
      doc.scrollHeight,
      body ? body.scrollHeight : 0
    );
    const maxScroll = scrollHeight - window.innerHeight;
    const clampedTargetY = Math.min(Math.max(targetY, 0), maxScroll);
    const distance = clampedTargetY - startY;
    const duration = getDuration(distance);
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(t);
      window.scrollTo(0, startY + distance * eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setHash(hash);
      }
    };

    requestAnimationFrame(step);
  };

  document.documentElement.classList.add("has-smooth-scroll");
  document.addEventListener("click", onClick, { capture: true });
})();
