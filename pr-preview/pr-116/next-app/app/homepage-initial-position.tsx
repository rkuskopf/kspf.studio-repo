"use client";

import { useEffect } from "react";

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

  return null;
}
