// Shared by the Storyblok schema and Next.js. CMS values are registry keys, never CSS.
export const FONT_REGISTRY = {
  courier: { name: "Courier New", family: '"Courier New", Courier, monospace' },
  akzidenz: { name: "Akzidenz Grotesk", family: '"akzidenz-grotesk-next-pro", Helvetica, Arial, sans-serif', stylesheet: "https://use.typekit.net/lkv5osw.css" },
  sans: { name: "Helvetica / Arial", family: 'Helvetica, Arial, sans-serif' },
  serif: { name: "Times New Roman", family: '"Times New Roman", Times, serif' },
};
export const FONT_WEIGHTS = [
  { name: "Light", value: "300" },
  { name: "Regular", value: "400" },
  { name: "Medium", value: "500" },
  { name: "Bold", value: "700" },
];
export const TYPOGRAPHY_ROLES = ["display", "heading", "body", "navigation", "metadata", "caption"];
