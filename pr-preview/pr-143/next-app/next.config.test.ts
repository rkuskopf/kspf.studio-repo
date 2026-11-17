import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("the local Storyblok Visual Editor response policy", () => {
  it("allows the Storyblok app to frame every Next.js route", async () => {
    const routeHeaders = await nextConfig.headers?.();
    const allRoutes = routeHeaders?.find((entry) => entry.source === "/:path*");

    expect(routeHeaders).toBeDefined();
    expect(allRoutes).toBeDefined();
    expect(allRoutes?.headers ?? []).toContainEqual({
      key: "Content-Security-Policy",
      value: "frame-ancestors https://app.storyblok.com",
    });
  });
});
