"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function HomepageWheelScroll() {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 601px) and (hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    let frame = 0;

    const stopWheel = () => {
      if (!lenis) return;
      lenis.stop();
      lenis.start();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        stopWheel();
      }
    };

    const update = () => {
      const enabled = desktop.matches && !reducedMotion.matches && !!document.querySelector(".homepage-project");
      if (enabled === !!lenis) return;

      if (!enabled) {
        cancelAnimationFrame(frame);
        lenis?.destroy();
        lenis = undefined;
        document.documentElement.classList.remove("has-home-scroll");
        return;
      }

      // Match the live site's free wheel glide; native touch and keyboard input remain available.
      lenis = new Lenis({
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.1,
        wheelMultiplier: 0.85,
        overscroll: false,
      });
      document.documentElement.classList.add("has-home-scroll");

      const tick = (time: number) => {
        if (!lenis) return;
        lenis.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    desktop.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    window.addEventListener("touchstart", stopWheel, { passive: true });
    window.addEventListener("pointerdown", stopWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    update();

    return () => {
      desktop.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
      window.removeEventListener("touchstart", stopWheel);
      window.removeEventListener("pointerdown", stopWheel);
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
      lenis?.destroy();
      document.documentElement.classList.remove("has-home-scroll");
    };
  }, []);

  return null;
}
