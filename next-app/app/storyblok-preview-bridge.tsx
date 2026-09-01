"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

import {
  STORYBLOK_BRIDGE_URL,
  subscribeToStoryblokBridge,
  type StoryblokBridgeConstructor,
} from "../lib/storyblok/bridge";

export default function StoryblokPreviewBridge() {
  const connected = useRef(false);
  const connect = useCallback(() => {
    const Bridge = (
      window as Window & { StoryblokBridge?: StoryblokBridgeConstructor }
    ).StoryblokBridge;
    if (connected.current || typeof Bridge !== "function") return;

    connected.current = true;
    subscribeToStoryblokBridge(Bridge, () => window.location.reload());
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
