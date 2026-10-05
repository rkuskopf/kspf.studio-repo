import Lenis from './assets/vendor/lenis-1.3.26/lenis.module.js';

const root = document.documentElement;
const desktop = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const projects = document.getElementById('projects');
let lenis;
let frame = 0;
let navigationTarget;
let finishNavigation;

const update = () => {
  const enabled = desktop.matches && !reducedMotion.matches && projects.children.length > 0;
  if (enabled === Boolean(lenis)) return;
  if (!enabled) {
    cancelAnimationFrame(frame);
    lenis?.destroy();
    lenis = undefined;
    // Complete navigation directly when switching to native scrolling.
    if (navigationTarget) window.scrollTo(0, navigationTarget.getBoundingClientRect().top + scrollY);
    finishNavigation?.();
    root.classList.remove('has-home-scroll');
    return;
  }
  // Interpolate ordinary wheel input only: no project targets or gesture gate.
  lenis = new Lenis({
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.1,
    wheelMultiplier: 0.85,
    overscroll: false,
    virtualScroll({ event, deltaY }) {
      // Deliberate scrolling can interrupt an Information/Work animation too.
      if (event.type === 'wheel' && !event.ctrlKey && deltaY) finishNavigation?.();
    },
  });
  root.classList.add('has-home-scroll');
  const raf = (time) => {
    if (!lenis) return;
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  };
  frame = requestAnimationFrame(raf);
};

window.kspfHomeScroll = {
  navigate(target, animate, onComplete) {
    if (!lenis) return false;
    navigationTarget = target;
    const complete = () => {
      navigationTarget = undefined;
      finishNavigation = undefined;
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
// Let native keyboard, touch and scrollbar input take over from wheel gliding.
const cancelWheel = () => {
  if (lenis) { lenis.stop(); lenis.start(); finishNavigation?.(); }
};
window.addEventListener('touchstart', cancelWheel, { passive: true });
window.addEventListener('pointerdown', cancelWheel, { passive: true });
window.addEventListener('keydown', (event) => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) cancelWheel();
});
update();
