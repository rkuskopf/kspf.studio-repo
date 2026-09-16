"use client";

import { useEffect, useRef, useState } from "react";

import type { HomepageProject } from "../lib/storyblok/types";
import { useHomepageViewport } from "./use-homepage-viewport";

export function nextSlideIndex(current: number, delta: number, length: number) {
  if (length <= 0) return 0;
  return (current + delta + length) % length;
}

export function isPortraitDimensions(width: number, height: number) {
  return width > 0 && height > 0 && width / height < 1;
}

export function videoMotionAttributes(
  prefersReducedMotion: boolean,
  isVisible: boolean
) {
  return {
    autoPlay: !prefersReducedMotion && isVisible,
    loop: !prefersReducedMotion,
  };
}

export default function HomepageSlideshow({
  project,
  priority = false,
}: {
  project: HomepageProject;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [isClassified, setIsClassified] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const imageElement = useRef<HTMLImageElement | null>(null);
  const videoElement = useRef<HTMLVideoElement | null>(null);
  const { ref: viewportElement, isVisible, isNearViewport } =
    useHomepageViewport<HTMLElement>();
  const slide = project.slides[index] ?? project.slides[0];
  const hasMultipleSlides = project.slides.length > 1;

  const move = (delta: number) => {
    setIsClassified(false);
    setIndex((current) => nextSlideIndex(current, delta, project.slides.length));
  };

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) {
      setPrefersReducedMotion(false);
      return;
    }
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (
      typeof Image === "undefined" ||
      !hasMultipleSlides ||
      !isNearViewport
    ) {
      return;
    }
    const neighborIndexes = [
      nextSlideIndex(index, -1, project.slides.length),
      nextSlideIndex(index, 1, project.slides.length),
    ];
    neighborIndexes.forEach((neighborIndex) => {
      const neighbor = project.slides[neighborIndex];
      if (neighbor?.type === "image") {
        const image = new Image();
        image.src = neighbor.url;
      }
    });
  }, [hasMultipleSlides, index, isNearViewport, project.slides]);

  useEffect(() => {
    if (slide?.type === "image" && imageElement.current?.complete) {
      setIsPortrait(
        isPortraitDimensions(
          imageElement.current.naturalWidth,
          imageElement.current.naturalHeight
        )
      );
      setIsClassified(true);
    }
    if (slide?.type === "video" && (videoElement.current?.readyState ?? 0) >= 1) {
      setIsPortrait(
        isPortraitDimensions(
          videoElement.current?.videoWidth ?? 0,
          videoElement.current?.videoHeight ?? 0
        )
      );
      setIsClassified(true);
    }
  }, [slide?.type, slide?.url]);

  useEffect(() => {
    const video = videoElement.current;
    if (slide?.type !== "video" || !video) return;
    if (prefersReducedMotion || !isVisible) {
      video.pause();
      return;
    }
    video.play().catch(() => {});
  }, [isVisible, prefersReducedMotion, slide?.type, slide?.url]);

  if (!slide) return null;

  const mediaClassName = [
    "homepage-hero__media",
    !isClassified ? "is-orientation-pending" : "",
    isPortrait ? "is-portrait" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure
      ref={viewportElement}
      className="homepage-hero"
      tabIndex={0}
      aria-label={`${project.displayName} slideshow`}
      data-slide-index={index}
      onKeyDown={(event) => {
        if (!hasMultipleSlides) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" || !hasMultipleSlides) return;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const start = pointer.current;
        if (!start || start.id !== event.pointerId) return;
        pointer.current = null;
        const deltaX = event.clientX - start.x;
        const deltaY = event.clientY - start.y;
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
          move(deltaX > 0 ? -1 : 1);
        }
      }}
      onPointerCancel={() => {
        pointer.current = null;
      }}
    >
      {hasMultipleSlides ? (
        <>
          <button
            className="homepage-hero__hit homepage-hero__hit--previous"
            type="button"
            aria-label={`Previous ${project.displayName} image`}
            onClick={() => move(-1)}
          />
          <button
            className="homepage-hero__hit homepage-hero__hit--next"
            type="button"
            aria-label={`Next ${project.displayName} image`}
            onClick={() => move(1)}
          />
        </>
      ) : null}

      {slide.type === "video" ? (
        <video
          ref={videoElement}
          className={mediaClassName}
          key={slide.url}
          src={slide.url}
          {...videoMotionAttributes(prefersReducedMotion, isVisible)}
          muted
          playsInline
          preload="metadata"
          aria-label={project.alt || project.displayName}
          onLoadedMetadata={(event) => {
            setIsPortrait(
              isPortraitDimensions(event.currentTarget.videoWidth, event.currentTarget.videoHeight)
            );
            setIsClassified(true);
          }}
          onError={() => {
            setIsPortrait(false);
            setIsClassified(true);
          }}
        />
      ) : (
        <img
          ref={imageElement}
          className={mediaClassName}
          key={slide.url}
          src={slide.url}
          alt={project.alt || project.displayName}
          loading={priority ? "eager" : "lazy"}
          onLoad={(event) => {
            setIsPortrait(
              isPortraitDimensions(
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight
              )
            );
            setIsClassified(true);
          }}
          onError={() => {
            setIsPortrait(false);
            setIsClassified(true);
          }}
        />
      )}
    </figure>
  );
}
