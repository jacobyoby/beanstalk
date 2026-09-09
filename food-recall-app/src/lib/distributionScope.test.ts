import { describe, expect, it } from "vitest";
import { distributionScope } from "./distributionScope";

describe("distributionScope", () => {
  it("reports nationwide distribution", () => {
    expect(distributionScope("Nationwide").label).toBe("Nationwide");
    expect(distributionScope("Distributed nationwide and to Canada").label).toBe("Nationwide");
  });

  it("counts distinct states from abbreviations and full names, in order of appearance", () => {
    expect(distributionScope("AZ, CA, and TX")).toEqual({ label: "3 states", states: ["AZ", "CA", "TX"] });
    expect(distributionScope("Distribution in Virginia")).toEqual({ label: "1 state", states: ["VA"] });
    expect(distributionScope("California and CA retail")).toEqual({ label: "1 state", states: ["CA"] });
  });

  it("never reads lowercase English words as states", () => {
    expect(distributionScope("unrelated text with in inside").label).toBe("Unclear");
  });

  it("treats empty or region-only text as unclear", () => {
    expect(distributionScope("").label).toBe("Unclear");
    expect(distributionScope("retail only").label).toBe("Unclear");
    expect(distributionScope("Direct to consumer").label).toBe("Unclear");
  });

  it("prefers nationwide over a partial state list", () => {
    expect(distributionScope("Nationwide - retail, including CA and NY").label).toBe("Nationwide");
  });
});
