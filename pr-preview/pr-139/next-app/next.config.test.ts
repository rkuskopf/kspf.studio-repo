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

it("prevents preview indexing and signed URL referrer disclosure", async () => {
 const policies=await nextConfig.headers?.();
 const headers=policies?.find(entry=>entry.source==="/:path*")?.headers;
 expect(headers).toContainEqual({key:"X-Robots-Tag",value:"noindex, nofollow, noarchive"});
 expect(headers).toContainEqual({key:"Referrer-Policy",value:"no-referrer"});
});
it("redirects only homepage aliases, preserving the preview origin", async () => {
 const redirects=await nextConfig.redirects?.();
 expect(redirects).toEqual([
  {source:"/home",destination:"/",permanent:false},
  {source:"/index.html",destination:"/",permanent:false},
 ]);
});
