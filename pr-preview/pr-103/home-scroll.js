import Lenis from './assets/vendor/lenis-1.3.26/lenis.module.js';
import { createGestureLimiter, settleCurve, WHEEL_MULTIPLIER, LERP, INPUT_IDLE_MS } from './home-scroll-gesture.js';

const root = document.documentElement;
const desktop = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const work = document.getElementById('work');
const information = document.getElementById('information');
const projects = document.getElementById('projects');
let lenis;
let frame = 0;
let settleTimer = 0;
let frameSeconds = 1/60;
let navigating = false;
let finishNavigation;
let navigationTarget;
const gesture = createGestureLimiter({ resistance: 1 });

const resetGesture = () => {
  clearTimeout(settleTimer);
  gesture.reset();
};
const points = () => {
  const limit = Math.max(0, root.scrollHeight - innerHeight);
  const clamp = (y) => Math.max(0, Math.min(limit, y));
  return [...new Set([
    clamp(information.getBoundingClientRect().top + scrollY),
    ...[...projects.querySelectorAll('.project-block')].map((row) => {
      const rect = row.getBoundingClientRect();
      return clamp(scrollY + rect.top + rect.height/2 - innerHeight/2);
    }),
  ])];
};
const settle = () => {
  if (!lenis || navigating) return;
  const destination = gesture.destination();
  if (destination === undefined) return;
  const distance = destination - lenis.animatedScroll;
  if (Math.abs(distance) < 0.5) return;
  const curve = settleCurve(distance, lenis.velocity / frameSeconds);
  lenis.scrollTo(destination, { ...curve, lerp: 0 });
};

const update = () => {
  const enabled = desktop.matches && !reducedMotion.matches && projects.children.length > 0;
  if (enabled === Boolean(lenis)) return;
  resetGesture();
  if (!enabled) {
    const complete = finishNavigation;
    finishNavigation = undefined;
    navigating = false;
    cancelAnimationFrame(frame);
    lenis?.destroy();
    lenis = undefined;
    // Finish an interrupted navigation directly before restoring native snap.
    if (navigationTarget) window.scrollTo(0, navigationTarget.getBoundingClientRect().top + scrollY);
    navigationTarget = undefined;
    root.classList.remove('has-home-scroll');
    complete?.();
    return;
  }
  lenis = new Lenis({
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: WHEEL_MULTIPLIER,
    lerp: LERP,
    overscroll: false,
    virtualScroll(data) {
      if (data.event.type !== 'wheel' || data.event.ctrlKey || data.event.shiftKey ||
          Math.abs(data.deltaX) > Math.abs(data.deltaY)) return false;
      // Retain Lenis prevention for zero/clamped deltas: returning false here
      // would let native wheel movement escape the gesture bounds.
      data.event.preventDefault();
      if (navigating) { data.deltaY = 0; return; }
      data.deltaY = gesture.input(data.deltaY, lenis.animatedScroll,
        lenis.targetScroll, points(), performance.now());
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, INPUT_IDLE_MS);
    },
  });
  root.classList.add('has-home-scroll');
  let previousTime;
  const raf = (time) => {
    if (!lenis) return;
    frameSeconds = previousTime === undefined ? 1/60 : Math.max(0.001, (time-previousTime)/1000);
    previousTime = time;
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  };
  frame = requestAnimationFrame(raf);
};

// Existing Information/Work code retains history, focus and startup behaviour;
// on desktop it delegates animation to this same controller.
window.kspfHomeScroll = {
  navigate(target, animate, onComplete) {
    if (!lenis) return false;
    resetGesture();
    navigating = true;
    navigationTarget = target;
    const complete = () => {
      navigating = false;
      finishNavigation = undefined;
      navigationTarget = undefined;
      onComplete();
    };
    finishNavigation = complete;
    lenis.scrollTo(target, {
      immediate: !animate,
      duration: 0.9,
      lerp: 0,
      easing: (t) => 1-Math.pow(1-t, 3),
      onComplete: complete,
    });
    return true;
  },
};

desktop.addEventListener('change', update);
reducedMotion.addEventListener('change', update);
new MutationObserver(update).observe(projects, { childList: true });
window.addEventListener('resize', () => { resetGesture(); lenis?.resize(); });
// Keyboard, touch and scrollbar input are native and cancel the wheel policy.
const cancelWheel = () => {
  resetGesture();
  if (!navigating) lenis?.scrollTo(lenis.actualScroll, { immediate: true });
};
window.addEventListener('touchstart', cancelWheel, { passive: true });
window.addEventListener('pointerdown', cancelWheel, { passive: true });
window.addEventListener('keydown', (event) => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) cancelWheel();
});
update();
