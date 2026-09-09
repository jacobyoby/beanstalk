import { describe, expect, it } from "vitest";
import {
  buildDietaryPredicate,
  DIETARY_LABELS,
  type DietaryConcern,
  getDietaryMatches,
  isDietaryUncertain,
  matchesDietaryConcerns,
} from "./dietary";

const makeRecall = (product: string, reason: string) => ({
  productDescription: product,
  reasonForRecall: reason,
});

describe("getDietaryMatches", () => {
  it("matches allergen terms in reason_for_recall", () => {
    const recall = makeRecall("Chocolate Bar", "Undeclared milk allergen");
    const matches = getDietaryMatches(recall, ["milk"]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ concern: "milk", field: "reason", term: "milk" });
  });

  it("matches allergen terms in product_description", () => {
    const recall = makeRecall("Peanut Butter Cookies, 12oz", "Mislabeling");
    const matches = getDietaryMatches(recall, ["peanuts"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].field).toBe("product");
    expect(matches[0].term).toBe("peanut");
  });

  it("matches related terms (e.g., dairy for milk)", () => {
    const recall = makeRecall("Dairy Cream Pie", "Potential contamination");
    const matches = getDietaryMatches(recall, ["milk"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe("dairy");
  });

  it("matches multiple concerns independently", () => {
    const recall = makeRecall("Soy Milk Chocolate", "Undeclared wheat");
    const matches = getDietaryMatches(recall, ["soybeans", "wheat", "milk"]);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    const concerns = matches.map((m) => m.concern);
    expect(concerns).toContain("soybeans");
    expect(concerns).toContain("wheat");
  });

  it("deduplicates by concern (first match only)", () => {
    const recall = makeRecall("Milk Chocolate with Dairy Cream", "Contains milk and dairy");
    const matches = getDietaryMatches(recall, ["milk"]);
    expect(matches).toHaveLength(1);
  });

  it("returns empty array when no concerns selected", () => {
    const recall = makeRecall("Peanut Butter", "Undeclared milk");
    expect(getDietaryMatches(recall, [])).toEqual([]);
  });

  it("returns empty array when no terms match", () => {
    const recall = makeRecall("Plain Rice", "Foreign matter");
    expect(getDietaryMatches(recall, ["milk", "peanuts"])).toEqual([]);
  });

  it("is case-insensitive", () => {
    const recall = makeRecall("MILK CHOCOLATE", "UNDECLARED PEANUT");
    const matches = getDietaryMatches(recall, ["milk", "peanuts"]);
    expect(matches.length).toBe(2);
  });

  it('handles negation: "free from" before allergen term', () => {
    const recall = makeRecall("Product free from dairy ingredients", "May contain traces");
    const matches = getDietaryMatches(recall, ["milk"]);
    // "dairy" in product but preceded by "free from" — should be negated
    const dairyMatches = matches.filter((m) => m.term === "dairy");
    expect(dairyMatches).toHaveLength(0);
  });

  it('handles negation: "does not contain soy"', () => {
    const recall = makeRecall("Granola Bar", "Product does not contain soy but was mislabeled");
    const matches = getDietaryMatches(recall, ["soybeans"]);
    expect(matches).toHaveLength(0);
  });

  it("matches shellfish terms for crustacean concern", () => {
    const recall = makeRecall("Frozen Shrimp, 1lb", "Potential Listeria");
    const matches = getDietaryMatches(recall, ["crustacean"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe("shrimp");
  });

  it("matches tree nut sub-types", () => {
    const recall = makeRecall("Almond Butter", "Undeclared allergens");
    const matches = getDietaryMatches(recall, ["tree_nuts"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].term).toBe("almond");
  });

  it("handles empty product and reason", () => {
    const recall = makeRecall("", "");
    expect(getDietaryMatches(recall, ["milk"])).toEqual([]);
  });
});

describe("matchesDietaryConcerns", () => {
  it("returns true when no concerns selected (no filter)", () => {
    expect(matchesDietaryConcerns(makeRecall("Anything", "Anything"), [])).toBe(true);
  });

  it("returns true when recall matches at least one concern", () => {
    const recall = makeRecall("Cheese Pizza", "Recall");
    expect(matchesDietaryConcerns(recall, ["milk"])).toBe(true);
  });

  it("returns false when recall matches no concerns", () => {
    const recall = makeRecall("Plain Rice", "Foreign matter");
    expect(matchesDietaryConcerns(recall, ["milk", "peanuts"])).toBe(false);
  });
});

describe("buildDietaryPredicate", () => {
  it("returns null for empty selection", () => {
    expect(buildDietaryPredicate([])).toBeNull();
  });

  it("builds OR clause for single concern", () => {
    const result = buildDietaryPredicate(["peanuts"]);
    expect(result).toContain('reason_for_recall:"peanut"');
    expect(result).toContain('product_description:"peanut"');
    expect(result).toMatch(/^\(.*\)$/);
  });

  it("builds combined clause for multiple concerns", () => {
    const result = buildDietaryPredicate(["milk", "wheat"]);
    expect(result).toContain('reason_for_recall:"milk"');
    expect(result).toContain('reason_for_recall:"wheat"');
    expect(result).toContain('product_description:"cheese"');
  });

  it("wraps in parentheses", () => {
    const result = buildDietaryPredicate(["sesame"]);
    expect(result).toMatch(/^\(/);
    expect(result).toMatch(/\)$/);
  });
});

describe("isDietaryUncertain", () => {
  it("returns true when both fields are empty", () => {
    expect(isDietaryUncertain(makeRecall("", ""))).toBe(true);
  });

  it("returns false when product has content", () => {
    expect(isDietaryUncertain(makeRecall("Something", ""))).toBe(false);
  });

  it("returns false when reason has content", () => {
    expect(isDietaryUncertain(makeRecall("", "Something"))).toBe(false);
  });
});

describe("DIETARY_LABELS", () => {
  it("has a label for every concern", () => {
    const concerns: DietaryConcern[] = [
      "milk",
      "eggs",
      "fish",
      "crustacean",
      "tree_nuts",
      "peanuts",
      "wheat",
      "soybeans",
      "sesame",
      "gluten",
      "vegan",
      "vegetarian",
      "halal",
      "kosher",
    ];
    for (const c of concerns) {
      expect(DIETARY_LABELS[c]).toBeTruthy();
      expect(typeof DIETARY_LABELS[c]).toBe("string");
    }
  });
});

describe("dietary suffix negation", () => {
  it('treats "milk-free" as negated for milk', () => {
    expect(matchesDietaryConcerns(makeRecall("milk-free alternative", ""), ["milk"])).toBe(false);
  });

  it('treats "dairy free" as negated for milk', () => {
    expect(matchesDietaryConcerns(makeRecall("dairy free product", ""), ["milk"])).toBe(false);
  });

  it('treats "peanut-free, tree nuts" — peanut negated, tree nuts present', () => {
    const concerns: DietaryConcern[] = ["peanuts", "tree_nuts"];
    const matches = getDietaryMatches(makeRecall("peanut-free product that also contains tree nuts", ""), concerns).map(
      (m) => m.concern,
    );
    expect(matches).not.toContain("peanuts");
    expect(matches).toContain("tree_nuts");
  });

  it('treats "gluten free" as negated for gluten', () => {
    expect(matchesDietaryConcerns(makeRecall("gluten free bread", ""), ["gluten"])).toBe(false);
  });
});

describe("dietary prefix negation (regression)", () => {
  it('still negates "free of milk"', () => {
    expect(matchesDietaryConcerns(makeRecall("free of milk", ""), ["milk"])).toBe(false);
  });

  it('still negates "without eggs"', () => {
    expect(matchesDietaryConcerns(makeRecall("without eggs", ""), ["eggs"])).toBe(false);
  });

  it('still negates "no peanuts"', () => {
    expect(matchesDietaryConcerns(makeRecall("no peanuts", ""), ["peanuts"])).toBe(false);
  });
});

describe("dietary positive detection", () => {
  it("detects milk when present without negation", () => {
    expect(matchesDietaryConcerns(makeRecall("contains milk", ""), ["milk"])).toBe(true);
  });

  it("detects gluten when present without negation", () => {
    expect(matchesDietaryConcerns(makeRecall("wheat and gluten", ""), ["gluten"])).toBe(true);
  });
});
