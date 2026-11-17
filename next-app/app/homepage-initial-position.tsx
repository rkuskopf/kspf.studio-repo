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

  useLayoutEffect(() => {
    const information = document.querySelector<HTMLElement>("#information[data-before-navigation]");
    const next = information?.nextElementSibling;
    const nav = next?.querySelector<HTMLElement>(".homepage-top");
    if (!information || !next || !nav) return;

    const measure = () => {
      const hostTop = next.getBoundingClientRect().top;
      const bounds = nav.getBoundingClientRect();
      information.style.setProperty("--information-nav-top", `${bounds.top - hostTop}px`);
      information.style.setProperty("--information-nav-bottom", `${bounds.bottom - hostTop}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return null;
}
