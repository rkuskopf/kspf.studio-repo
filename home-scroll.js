(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const LINE_HEIGHT = 16;
  const STEP_FACTOR_PIXEL = 0.65;
  const STEP_FACTOR_LINE = 0.75;
  const STEP_FACTOR_PAGE = 0.85;
  const MAX_STEP = 900;
  const MIN_STEP = 30;

  const SMOOTHING = 0.14;
  const STOP_EPSILON = 0.6;

  let targetY = window.pageYOffset;
  let rafId = 0;
  let listenersBound = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const getMaxScroll = () => {
    const doc = document.documentElement;
    const body = document.body;
    const height = Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    return Math.max(0, height - window.innerHeight);
  };

  const shouldHandle = (event) => {
    if (prefersReducedMotion) return false;
    if (event.ctrlKey || event.metaKey) return false;
    if (document.body.classList.contains("information-open")) return false;
    if (document.body.classList.contains("clients-open")) return false;
    if (!(event.target instanceof Element)) return true;
    if (event.target.closest(".information-overlay, .clients-overlay")) return false;
    return true;
  };

  const stopAnimation = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const animate = () => {
    const currentY = window.pageYOffset;
    const diff = targetY - currentY;
    if (Math.abs(diff) < STOP_EPSILON) {
      window.scrollTo(0, targetY);
      rafId = 0;
      return;
    }
    window.scrollTo(0, currentY + diff * SMOOTHING);
    rafId = requestAnimationFrame(animate);
  };

  const applyDelta = (delta) => {
    const maxScroll = getMaxScroll();
    targetY = clamp(targetY + delta, 0, maxScroll);
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
  };

  const onWheel = (event) => {
    if (!shouldHandle(event)) return;
    const rawDelta = event.deltaY;
    if (!Number.isFinite(rawDelta) || rawDelta === 0) return;

    event.preventDefault();

    let delta = rawDelta;
    if (event.deltaMode === 1) {
      delta = rawDelta * LINE_HEIGHT;
      delta = Math.sign(delta) * Math.max(MIN_STEP, Math.min(MAX_STEP, Math.abs(delta) * STEP_FACTOR_LINE));
    } else if (event.deltaMode === 2) {
      delta = rawDelta * window.innerHeight;
      delta = Math.sign(delta) * Math.max(MIN_STEP, Math.min(MAX_STEP, Math.abs(delta) * STEP_FACTOR_PAGE));
    } else {
      delta = Math.sign(delta) * Math.max(MIN_STEP, Math.min(MAX_STEP, Math.abs(delta) * STEP_FACTOR_PIXEL));
    }

    applyDelta(delta);
  };

  const init = () => {
    if (listenersBound) return;
    listenersBound = true;
    targetY = window.pageYOffset;
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", () => {
      targetY = clamp(targetY, 0, getMaxScroll());
    });
  };

  window.initHomeScrollAssist = init;

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
