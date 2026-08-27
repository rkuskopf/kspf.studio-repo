"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

import {
  STORYBLOK_BRIDGE_URL,
  subscribeToStoryblokBridge,
  type StoryblokBridgeConstructor,
} from "../lib/storyblok/bridge";

declare global {
  interface Window {
    StoryblokBridge?: StoryblokBridgeConstructor;
  }
}

export default function StoryblokPreviewBridge() {
  const connected = useRef(false);
  const connect = useCallback(() => {
    if (connected.current || typeof window.StoryblokBridge !== "function") return;

    connected.current = true;
    subscribeToStoryblokBridge(window.StoryblokBridge, () => window.location.reload());
  }, []);

  return (
    <Script
      id="kspf-storyblok-preview-bridge"
      src={STORYBLOK_BRIDGE_URL}
      strategy="afterInteractive"
      onLoad={connect}
      onReady={connect}
    />
  );
}
