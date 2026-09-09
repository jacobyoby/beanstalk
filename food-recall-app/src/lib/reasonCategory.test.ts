import { describe, expect, it } from "vitest";
import { buildReasonCategoryPredicate, categorizeReason, hazardLabel, isReasonCategory } from "./reasonCategory";

describe("categorizeReason", () => {
  it("classifies pathogen contamination", () => {
    expect(categorizeReason("Potential Listeria monocytogenes contamination")).toBe("Pathogen");
    expect(categorizeReason("Product may be contaminated with E. coli O157:H7")).toBe("Pathogen");
  });

  it("classifies undeclared allergens, including FDA phrasings without the word undeclared", () => {
    expect(categorizeReason("Undeclared milk and soy allergens")).toBe("Undeclared allergen");
    expect(categorizeReason("Label does not declare walnuts in English")).toBe("Undeclared allergen");
    expect(categorizeReason("Soba sauce packet, which contains bonito (fish), was not declared on the label")).toBe(
      "Undeclared allergen",
    );
  });

  it("prefers foreign material over the allergen rule when both words appear", () => {
    expect(categorizeReason("May contain pieces of plastic; label also omits allergen statement")).toBe(
      "Foreign material",
    );
  });

  it("classifies chemical hazards and labeling problems", () => {
    expect(categorizeReason("Elevated levels of lead detected")).toBe("Chemical or toxin");
    expect(categorizeReason("Product was mislabeled with the wrong best-by date")).toBe("Labeling or packaging");
  });

  it("returns null when nothing matches", () => {
    expect(categorizeReason("Firm initiated recall")).toBeNull();
    expect(categorizeReason("")).toBeNull();
  });
});

describe("hazardLabel", () => {
  it("names the pathogen", () => {
    expect(hazardLabel("Potential Listeria monocytogenes contamination")).toBe("Listeria");
    expect(hazardLabel("Product may be contaminated with E. coli O157:H7")).toBe("E. coli");
  });

  it("names the undeclared allergen, first one wins", () => {
    expect(hazardLabel("Undeclared milk and soy allergens")).toBe("Undeclared milk");
    expect(hazardLabel("Label does not declare walnuts in English")).toBe("Undeclared tree nuts");
    expect(hazardLabel("Soba sauce packet, which contains bonito (fish), was not declared on the label")).toBe(
      "Undeclared fish",
    );
  });

  it("keeps an allergen word inside a pathogen recall as the pathogen", () => {
    expect(hazardLabel("Salmonella contamination of shell eggs")).toBe("Salmonella");
  });

  it("names foreign material and chemical agents", () => {
    expect(hazardLabel("Foreign object: products may contain glass pieces")).toBe("Glass");
    expect(hazardLabel("Elevated levels of lead detected")).toBe("Lead");
  });

  it("returns null when the category is known but the agent is not, or nothing matches", () => {
    expect(hazardLabel("Undeclared allergen statement missing")).toBeNull();
    expect(hazardLabel("Product was mislabeled with the wrong best-by date")).toBeNull();
    expect(hazardLabel("Firm initiated recall")).toBeNull();
  });
});

describe("buildReasonCategoryPredicate", () => {
  it("groups quoted reason_for_recall terms with OR", () => {
    const predicate = buildReasonCategoryPredicate("Pathogen");
    expect(predicate.startsWith("(")).toBe(true);
    expect(predicate.endsWith(")")).toBe(true);
    expect(predicate).toContain('reason_for_recall:"salmonella"');
    expect(predicate).toContain(" OR ");
  });

  it("recognizes category names", () => {
    expect(isReasonCategory("Pathogen")).toBe(true);
    expect(isReasonCategory("Class I")).toBe(false);
  });
});
