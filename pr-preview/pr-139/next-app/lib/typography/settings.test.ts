import { describe, expect, it } from "vitest";
import { mapTypography, mapFontWeight, typographyTokens } from "./settings";
const settings = (style: unknown) => [{ component: "typography_settings", body: [{ component: "typography_style", ...style as object }] }];

describe("Storyblok typography", () => {
  it("keeps legacy context defaults when settings are absent or malformed", () => {
    const defaults = mapTypography(undefined);
    for (const value of [null, {}, [], [{ component: "wrong" }]]) {
      expect(mapTypography(value)).toEqual(defaults);
    }
    expect(defaults.navigation.fontFamily).toBe("akzidenz");
    expect(defaults.navigation.textTransform).toBe("uppercase");
    expect(defaults.body.fontFamily).toBe("courier");
    expect(typographyTokens(defaults)).not.toHaveProperty("--type-body-size");
    expect(typographyTokens(defaults)).not.toHaveProperty("--type-body-leading");
  });
  it("maps approved fonts, numeric strings and all text-style fields", () => {
    const mapped = mapTypography(settings({ font_family: "sans", font_weight: "500", desktop_size: "24", mobile_size: "16", line_height: "1.6", letter_spacing: "-0.02", text_transform: "lowercase" }));
    expect(mapped.body).toEqual({ fontFamily: "sans", fontWeight: 500, desktopSize: 24, mobileSize: 16, lineHeight: 1.6, letterSpacing: -0.02, textTransform: "lowercase" });
    expect(typographyTokens(mapped)).toMatchObject({ "--type-body-family": "Helvetica, Arial, sans-serif", "--type-body-size": "clamp(16px, calc(9.6px + 1vw), 24px)", "--type-body-weight": 500, "--type-body-tracking": "-0.02em" });
  });
  it.each(["url(evil)", "__proto__", "constructor", "Made up font"])("rejects arbitrary font family %s", (font_family) => {
    expect(mapTypography(settings({ font_family })).body.fontFamily).toBe("courier");
  });
  it("falls back field by field, rejecting CSS injection and unsafe numbers", () => {
    expect(mapTypography(settings({ desktop_size: "12px; color:red", mobile_size: 0, font_weight: "900", line_height: Infinity, letter_spacing: true, text_transform: "capitalize" })).body).toEqual(mapTypography(undefined).body);
    expect(mapTypography(settings({ desktop_size: 25, letter_spacing: 0 })).body.desktopSize).toBe(25);
    expect(typographyTokens(mapTypography(settings({ desktop_size: 25, letter_spacing: 0 })))).toMatchObject({ "--type-body-size": "25px", "--type-body-tracking": "0em" });
  });
  it("supports decreasing sizes and a single configured size", () => {
    expect(typographyTokens(mapTypography(settings({ desktop_size: 16, mobile_size: 24 })))).toHaveProperty("--type-body-size", "clamp(16px, calc(30.4px + -1vw), 24px)");
    expect(typographyTokens(mapTypography(settings({ mobile_size: 14 })))).toHaveProperty("--type-body-size", "14px");
  });
  it("only accepts approved nav weights; missing or invalid values inherit", () => {
    for (const weight of [300, 400, 500, 700]) expect(mapFontWeight(String(weight))).toBe(weight);
    for (const value of [undefined, null, "", "inherit", 900, "bold", "400; color:red"]) expect(mapFontWeight(value)).toBeNull();
  });
});
