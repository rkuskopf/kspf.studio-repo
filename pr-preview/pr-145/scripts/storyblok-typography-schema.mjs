import { FONT_REGISTRY, FONT_WEIGHTS, TYPOGRAPHY_ROLES } from "./typography-registry.mjs";
const field = (type, display_name, pos, extra = {}) => ({ type, display_name, pos, ...extra });
const option = (label, pos, options) => field("option", label, pos, { source: "self", options });
const blocks = (label, pos, component) => field("bloks", label, pos, {
  restrict_components: true, component_whitelist: [component], maximum: 1,
});
export const NAV_WEIGHT_FIELDS = Object.fromEntries(["home", "information"].map((item, index) => [
  `${item}_font_weight`, option(`${item === "home" ? "Home" : "Information"} font weight`, 6 + index,
    [{ name: "Inherit Navigation", value: "inherit" }, ...FONT_WEIGHTS]),
]));
export const TYPOGRAPHY_FIELD = blocks("Typography", 4, "typography_settings");
// Positive minimums also reject empty optional Number fields in Storyblok.
// Enforce those lower bounds in the frontend mapper instead.
export const TYPOGRAPHY_COMPONENTS = [
  {
    name: "typography_style", display_name: "Text style", is_root: false, is_nestable: true,
    schema: {
      font_family: option("Font family", 0, Object.entries(FONT_REGISTRY).map(([value, font]) => ({ name: font.name, value }))),
      font_weight: option("Font weight", 1, FONT_WEIGHTS),
      desktop_size: field("number", "Desktop font size (px)", 2, { max_value: 200, decimals: 2, steps: 0.01, description: "Optional. Leave blank to keep the default. Use 8-200px." }),
      mobile_size: field("number", "Mobile font size (px)", 3, { max_value: 200, decimals: 2, steps: 0.01, description: "Optional. Leave blank to keep the default. Use 8-200px." }),
      line_height: field("number", "Line height (ratio)", 4, { max_value: 3, decimals: 3, steps: 0.001, description: "Optional. Leave blank to keep the default. Use a ratio from 0.5 to 3, e.g. 1.2 for 120%." }),
      letter_spacing: field("number", "Letter spacing (em)", 5, { min_value: -0.2, max_value: 1, decimals: 3, steps: 0.001 }),
      text_transform: option("Text transform", 6, ["none", "uppercase", "lowercase"].map((value) => ({ name: value, value }))),
    },
  },
  {
    name: "typography_settings", display_name: "Typography", is_root: false, is_nestable: true,
    schema: Object.fromEntries(TYPOGRAPHY_ROLES.map((role, index) => [role, blocks(
      role === "metadata" ? "Metadata / UI" : role[0].toUpperCase() + role.slice(1), index, "typography_style",
    )])),
  },
];
