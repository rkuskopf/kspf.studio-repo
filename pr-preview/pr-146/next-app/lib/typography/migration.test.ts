import { describe, expect, it, vi } from "vitest";
// @ts-expect-error The CLI module is JavaScript.
import { runTypographyMigration } from "../../../scripts/setup-typography.mjs";
// @ts-expect-error Schema module is JavaScript.
import { TYPOGRAPHY_COMPONENTS, TYPOGRAPHY_FIELD, NAV_WEIGHT_FIELDS } from "../../../scripts/storyblok-typography-schema.mjs";
const apiFor = (components: unknown[]) => ({ listComponents: async () => components, createComponent: vi.fn(), updateComponent: vi.fn() });
const existing = [{ id: 1, name: "site_settings", schema: { profile: { type: "textarea" } } }, { id: 2, name: "nav_settings", schema: { home_label: { type: "text" } } }];
describe("additive typography migration", () => {
  it("plans without writes and applies without changing existing content fields", async () => {
    const api = apiFor(existing);
    expect(await runTypographyMigration({ api })).toHaveLength(4);
    expect(api.createComponent).not.toHaveBeenCalled();
    await runTypographyMigration({ api, apply: true });
    expect(api.createComponent).toHaveBeenCalledTimes(2);
    expect(api.updateComponent).toHaveBeenCalledWith(1, { ...existing[0], schema: { profile: { type: "textarea" }, typography: TYPOGRAPHY_FIELD } });
    expect(existing[0].schema).not.toHaveProperty("typography");
  });
  it("is idempotent after installation", async () => {
    const api = apiFor([...TYPOGRAPHY_COMPONENTS, { ...existing[0], schema: { ...existing[0].schema, typography: TYPOGRAPHY_FIELD } }, { ...existing[1], schema: { ...existing[1].schema, ...NAV_WEIGHT_FIELDS } }]);
    expect(await runTypographyMigration({ api, apply: true })).toEqual([]);
    expect(api.updateComponent).not.toHaveBeenCalled();
  });
  it("rejects conflicts before any write", async () => {
    const api = apiFor([{ ...existing[0], schema: { typography: { type: "text" } } }, existing[1]]);
    await expect(runTypographyMigration({ api, apply: true })).rejects.toThrow(/conflicts/);
    expect(api.createComponent).not.toHaveBeenCalled();
    expect(api.updateComponent).not.toHaveBeenCalled();
  });
});


it("keeps numeric fields optional and permits fractional editor values", () => {
  const style = TYPOGRAPHY_COMPONENTS.find((component: { name: string }) => component.name === "typography_style").schema;
  for (const key of ["desktop_size", "mobile_size", "line_height"]) {
    expect(style[key]).not.toHaveProperty("min_value");
    expect(style[key]).not.toHaveProperty("required");
  }
  expect(style.desktop_size.steps).toBe(0.01);
  expect(style.mobile_size.steps).toBe(0.01);
  expect(style.line_height.steps).toBe(0.001);
  expect(style.letter_spacing.steps).toBe(0.001);
});
