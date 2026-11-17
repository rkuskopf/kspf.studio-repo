"use client";

import { useEffect, useLayoutEffect } from "react";

import type { HomeContent } from "../lib/storyblok/types";

export function initialSectionId(section: HomeContent["initialSection"]) {
  return section === "info" ? "information" : "work";
}

export default function HomepageInitialPosition({
  section,
}: {
  section: HomeContent["initialSection"];
}) {
  useEffect(() => {
    if (window.location.hash) return;
    document.getElementById(initialSectionId(section))?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [section]);

  useEffect(() => {
    const information = document.querySelector<HTMLElement>("#information.homepage-information--three-columns");
    const work = document.getElementById("work");
    const infoLink = document.querySelector<HTMLAnchorElement>(".homepage-nav__information");
    if (!information || !work || !infoLink) return;

    const handleInfoClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const { top, bottom } = information.getBoundingClientRect();
      if (top > 1 || bottom <= 1 || Math.abs(work.getBoundingClientRect().top) <= 1) return;

      event.preventDefault();
      if (window.location.hash !== "#work") history.pushState(history.state, "", "#work");
      work.focus({ preventScroll: true });
      work.scrollIntoView({ block: "start" });
    };

    infoLink.addEventListener("click", handleInfoClick);
    return () => infoLink.removeEventListener("click", handleInfoClick);
  }, []);

  useLayoutEffect(() => {
    const information = document.querySelector<HTMLElement>("#information[data-before-navigation]");
    const next = information?.nextElementSibling;
    const nav = next?.querySelector<HTMLElement>(".homepage-top");
    if (!information || !next || !nav) return;

    const measure = () => {
      const hostTop = next.getBoundingClientRect().top;
      const bounds = nav.getBoundingClientRect();
      information.style.setProperty("--information-nav-bottom", `${bounds.bottom - hostTop}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return null;
}
