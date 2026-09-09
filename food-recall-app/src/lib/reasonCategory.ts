export type ReasonCategory =
  | "Pathogen"
  | "Foreign material"
  | "Undeclared allergen"
  | "Chemical or toxin"
  | "Labeling or packaging";

interface CategoryRule {
  category: ReasonCategory;
  pattern: RegExp;
}

/** Ordered rules: the first pattern that matches the FDA reason text wins. */
const RULES: CategoryRule[] = [
  {
    category: "Pathogen",
    pattern:
      /salmonella|listeria|e\.?\s?coli|hepatitis|norovirus|clostridium|botulinum|cronobacter|shigella|campylobacter|cyclospora|\bmold\b|microbial|bacteria|pathogen/i,
  },
  {
    category: "Foreign material",
    pattern:
      /foreign (material|matter|object)|\b(plastic|metal|glass|wood|stone|stones|rubber|insect|bone fragments?)\b/i,
  },
  {
    category: "Undeclared allergen",
    pattern:
      /undeclared|allergen|not declared|does not declare|not listed|omitted from the label|may contain (milk|eggs?|fish|shellfish|tree nuts?|peanuts?|wheat|soy|sesame)/i,
  },
  {
    category: "Chemical or toxin",
    pattern:
      /chemical|toxin|pesticide|\b(lead|arsenic|cadmium|mercury|histamine|aflatoxin)\b|ethylene oxide|sanitizer|cleaning solution/i,
  },
  { category: "Labeling or packaging", pattern: /mislabel|label|packag|seal|swollen|leak/i },
];

/**
 * openFDA search terms per category, used to filter server-side before pagination.
 * Keep aligned with RULES; phrases are quoted by the predicate builder.
 */
export const CATEGORY_SEARCH_TERMS: Record<ReasonCategory, string[]> = {
  Pathogen: [
    "salmonella",
    "listeria",
    "e. coli",
    "hepatitis",
    "norovirus",
    "clostridium",
    "botulinum",
    "cronobacter",
    "shigella",
    "campylobacter",
    "cyclospora",
    "mold",
    "microbial",
    "bacteria",
    "pathogen",
  ],
  "Foreign material": [
    "foreign material",
    "foreign matter",
    "foreign object",
    "plastic",
    "metal",
    "glass",
    "wood",
    "stones",
    "rubber",
    "insect",
    "bone fragments",
  ],
  "Undeclared allergen": ["undeclared", "allergen", "not declared", "does not declare", "not listed"],
  "Chemical or toxin": [
    "chemical",
    "toxin",
    "pesticide",
    "lead",
    "arsenic",
    "cadmium",
    "mercury",
    "histamine",
    "aflatoxin",
    "ethylene oxide",
    "sanitizer",
  ],
  "Labeling or packaging": ["mislabeled", "label", "packaging", "seal", "swollen", "leaking"],
};

interface HazardRule {
  label: string;
  pattern: RegExp;
}

/** Specific agent names, checked only within the matched category so "egg" in a pathogen recall stays a pathogen. */
const HAZARD_RULES: Record<ReasonCategory, HazardRule[]> = {
  Pathogen: [
    { label: "Salmonella", pattern: /salmonella/i },
    { label: "Listeria", pattern: /listeria/i },
    { label: "E. coli", pattern: /e\.?\s?coli/i },
    { label: "Hepatitis A", pattern: /hepatitis/i },
    { label: "Norovirus", pattern: /norovirus/i },
    { label: "Botulism risk", pattern: /clostridium|botulinum|botulism/i },
    { label: "Cronobacter", pattern: /cronobacter/i },
    { label: "Shigella", pattern: /shigella/i },
    { label: "Campylobacter", pattern: /campylobacter/i },
    { label: "Cyclospora", pattern: /cyclospora/i },
    { label: "Mold", pattern: /\bmold\b/i },
  ],
  "Foreign material": [
    { label: "Plastic", pattern: /plastic/i },
    { label: "Metal", pattern: /metal/i },
    { label: "Glass", pattern: /glass/i },
    { label: "Wood", pattern: /\bwood\b/i },
    { label: "Stones", pattern: /\bstones?\b/i },
    { label: "Rubber", pattern: /rubber/i },
    { label: "Insects", pattern: /insect/i },
    { label: "Bone fragments", pattern: /bone fragments?/i },
  ],
  "Undeclared allergen": [
    { label: "Undeclared milk", pattern: /\b(milk|dairy|whey|casein)\b/i },
    { label: "Undeclared egg", pattern: /\beggs?\b/i },
    { label: "Undeclared peanut", pattern: /peanuts?/i },
    { label: "Undeclared tree nuts", pattern: /tree nuts?|almonds?|walnuts?|cashews?|pecans?|hazelnuts?|pistachios?/i },
    { label: "Undeclared wheat", pattern: /\bwheat\b|\bgluten\b/i },
    { label: "Undeclared soy", pattern: /\bsoy(a|bean)?s?\b/i },
    { label: "Undeclared sesame", pattern: /sesame/i },
    { label: "Undeclared fish", pattern: /\bfish\b|anchov|bonito|sardine|mackerel|salmon|tuna/i },
    { label: "Undeclared shellfish", pattern: /shellfish|shrimp|crab|lobster|crustacean/i },
    { label: "Undeclared sulfites", pattern: /sulfites?|sulphites?/i },
  ],
  "Chemical or toxin": [
    { label: "Lead", pattern: /\blead\b/i },
    { label: "Arsenic", pattern: /arsenic/i },
    { label: "Cadmium", pattern: /cadmium/i },
    { label: "Mercury", pattern: /mercury/i },
    { label: "Histamine", pattern: /histamine/i },
    { label: "Aflatoxin", pattern: /aflatoxin/i },
    { label: "Pesticide residue", pattern: /pesticide/i },
    { label: "Ethylene oxide", pattern: /ethylene oxide/i },
  ],
  "Labeling or packaging": [],
};

/**
 * Derives a short display category from the free-text FDA reason.
 * Returns null when no rule matches so the UI shows nothing rather than a guess.
 */
export function categorizeReason(reason: string): ReasonCategory | null {
  const matched = RULES.find((rule) => rule.pattern.test(reason));
  return matched ? matched.category : null;
}

/**
 * Names the specific agent behind the reason ("Salmonella", "Undeclared egg", "Plastic") when the
 * text says so. Returns null when only the broad category is known.
 */
export function hazardLabel(reason: string): string | null {
  const category = categorizeReason(reason);
  if (!category) return null;
  const matched = HAZARD_RULES[category].find((rule) => rule.pattern.test(reason));
  return matched ? matched.label : null;
}

/** openFDA predicate: reason_for_recall mentions any of the category's terms. */
export function buildReasonCategoryPredicate(category: ReasonCategory): string {
  const clauses = CATEGORY_SEARCH_TERMS[category].map((term) => `reason_for_recall:"${term}"`);
  return `(${clauses.join(" OR ")})`;
}

export function isReasonCategory(value: string): value is ReasonCategory {
  return value in CATEGORY_SEARCH_TERMS;
}
