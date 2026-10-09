import { describe, expect, it } from "vitest";

import { subscribeToStoryblokBridge } from "./bridge";

describe("Storyblok Bridge refresh subscription", () => {
  it("reloads after Storyblok Save and Publish events", () => {
    let registeredEvents: string[] = [];
    let registeredCallback: (() => void) | undefined;
    let reloadCount = 0;

    class FakeBridge {
      on(events: string[], callback: () => void) {
        registeredEvents = events;
        registeredCallback = callback;
      }
    }

    subscribeToStoryblokBridge(FakeBridge, () => {
      reloadCount += 1;
    });

    expect(registeredEvents).toEqual(["change", "published"]);
    expect(registeredCallback).toBeTypeOf("function");
    registeredCallback?.();
    expect(reloadCount).toBe(1);
  });
});
