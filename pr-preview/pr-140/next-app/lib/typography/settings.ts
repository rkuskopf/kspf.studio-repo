import type { CSSProperties } from "react";
import { FONT_REGISTRY, FONT_WEIGHTS, TYPOGRAPHY_ROLES, type FontId, type TypographyRole } from "../../../scripts/typography-registry.mjs";

export type FontWeight = 300 | 400 | 500 | 700;
export type TextStyle = {
  fontFamily: FontId;
  fontWeight: FontWeight | null;
  desktopSize: number | null;
  mobileSize: number | null;
  lineHeight: number | null;
  letterSpacing: number | null;
  textTransform: "none" | "uppercase" | "lowercase";
};
export type TypographySettings = Record<TypographyRole, TextStyle>;

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const block = (value: unknown, component: string) => {
  const candidate = Array.isArray(value) ? record(value[0]) : {};
  return candidate.component === component ? candidate : {};
};
const number = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
};
export function mapFontWeight(value: unknown): FontWeight | null {
  return FONT_WEIGHTS.some(({ value: weight }) => weight === String(value)) ? Number(value) as FontWeight : null;
}

// Null properties deliberately retain context-specific legacy CSS defaults.
export function mapTypography(value: unknown): TypographySettings {
  const settings = block(value, "typography_settings");
  return Object.fromEntries(TYPOGRAPHY_ROLES.map((role) => {
    const style = block(settings[role], "typography_style");
    const defaultFont = role === "navigation" ? "akzidenz" : "courier";
    const fontFamily = typeof style.font_family === "string" && Object.hasOwn(FONT_REGISTRY, style.font_family)
      ? style.font_family as FontId : defaultFont;
    const transform = style.text_transform;
    return [role, {
      fontFamily,
      fontWeight: mapFontWeight(style.font_weight),
      desktopSize: number(style.desktop_size, 8, 200),
      mobileSize: number(style.mobile_size, 8, 200),
      lineHeight: number(style.line_height, 0.5, 3),
      letterSpacing: number(style.letter_spacing, -0.2, 1),
      textTransform: transform === "none" || transform === "uppercase" || transform === "lowercase"
        ? transform : role === "navigation" ? "uppercase" : "none",
    } satisfies TextStyle];
  })) as TypographySettings;
}

export function typographyTokens(settings: TypographySettings): CSSProperties {
  const tokens: Record<string, string | number> = {};
  for (const role of TYPOGRAPHY_ROLES) {
    const style = settings[role];
    const prefix = `--type-${role}`;
    tokens[`${prefix}-family`] = FONT_REGISTRY[style.fontFamily].family;
    tokens[`${prefix}-transform`] = style.textTransform;
    if (style.fontWeight !== null) tokens[`${prefix}-weight`] = style.fontWeight;
    if (style.lineHeight !== null) tokens[`${prefix}-leading`] = style.lineHeight;
    if (style.letterSpacing !== null) tokens[`${prefix}-tracking`] = `${style.letterSpacing}em`;
    if (style.desktopSize !== null || style.mobileSize !== null) {
      const desktop = style.desktopSize ?? style.mobileSize!;
      const mobile = style.mobileSize ?? desktop;
      const slope = (desktop - mobile) / 8; // fluid between 640px and 1440px
      const intercept = mobile - slope * 6.4;
      tokens[`${prefix}-size`] = desktop === mobile ? `${desktop}px`
        : `clamp(${Math.min(mobile, desktop)}px, calc(${intercept}px + ${slope}vw), ${Math.max(mobile, desktop)}px)`;
    }
  }
  return tokens as CSSProperties;
}
