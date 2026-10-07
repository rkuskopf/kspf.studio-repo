import { describe, expect, it } from "vitest";

import { viewportFallback } from "./use-homepage-viewport";

describe("homepage viewport fallback", () => {
  it("keeps server rendering inactive until an observer reports activity", () => {
    expect(viewportFallback(true)).toEqual({
      isVisible: false,
      isNearViewport: false,
    });
  });

  it("keeps media usable when IntersectionObserver is unavailable", () => {
    expect(viewportFallback(false)).toEqual({
      isVisible: true,
      isNearViewport: true,
    });
  });
});
