import { describe, expect, it } from "vitest";

import { initialSectionId } from "./homepage-initial-position";

describe("homepage initial position", () => {
  it("targets the published starting section without inventing another anchor", () => {
    expect(initialSectionId("work")).toBe("work");
    expect(initialSectionId("info")).toBe("information");
  });
});
