"use client";

import { useEffect, useRef, useState } from "react";

export const viewportFallback = (observerSupported: boolean) =>
  observerSupported
    ? { isVisible: false, isNearViewport: false }
    : { isVisible: true, isNearViewport: true };

export function useHomepageViewport<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      const fallback = viewportFallback(false);
      setIsVisible(fallback.isVisible);
      setIsNearViewport(fallback.isNearViewport);
      return;
    }

    const visibleObserver = new window.IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.25 }
    );
    const nearbyObserver = new window.IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: "100% 0px" }
    );
    visibleObserver.observe(element);
    nearbyObserver.observe(element);

    return () => {
      visibleObserver.disconnect();
      nearbyObserver.disconnect();
    };
  }, []);

  return { ref, isVisible, isNearViewport };
}
