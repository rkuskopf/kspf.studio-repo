import { describe, expect, it } from "vitest";
import { previewOrigin } from "./deployment";

describe("preview canonical origin", () => {
  it("uses a configured HTTPS origin instead of visitor-controlled hosts", () => {
    expect(previewOrigin({SITE_URL:"https://kspf-next-test.vercel.app/"}).href)
      .toBe("https://kspf-next-test.vercel.app/");
  });
  it("uses Vercel's deployment hostname without a manually configured URL", () => {
    expect(previewOrigin({VERCEL_URL:"kspf-next-abc.vercel.app"}).href)
      .toBe("https://kspf-next-abc.vercel.app/");
  });
  it("allows local development without deployment configuration", () => {
    expect(previewOrigin({}).href).toBe("http://localhost:3000/");
  });
  it.each(["javascript:alert(1)", "https://example.com/path", "https://user:secret@example.com", "https://example.com/?secret=x", "https://example.com/#work", "http://example.com"])("rejects non-origin or insecure setting %s", SITE_URL => {
    expect(()=>previewOrigin({SITE_URL})).toThrow(/SITE_URL/);
  });
});
