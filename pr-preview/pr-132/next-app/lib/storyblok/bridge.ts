export const STORYBLOK_BRIDGE_URL =
  "https://app.storyblok.com/f/storyblok-v2-latest.js";

export type StoryblokBridgeConstructor = new () => {
  on(events: string[], callback: () => void): void;
};

export function subscribeToStoryblokBridge(
  Bridge: StoryblokBridgeConstructor,
  reload: () => void
): void {
  const bridge = new Bridge();
  bridge.on(["change", "published"], reload);
}
