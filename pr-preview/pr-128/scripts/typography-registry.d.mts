export type FontId = "courier" | "akzidenz" | "sans" | "serif";
export type TypographyRole = "display" | "heading" | "body" | "navigation" | "metadata" | "caption";
export const FONT_REGISTRY: Record<FontId, { name: string; family: string; stylesheet?: string }>;
export const FONT_WEIGHTS: { name: string; value: string }[];
export const TYPOGRAPHY_ROLES: TypographyRole[];
