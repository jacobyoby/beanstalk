export type ReasonCategory =
  | 'Pathogen'
  | 'Foreign material'
  | 'Undeclared allergen'
  | 'Chemical or toxin'
  | 'Labeling or packaging'

interface CategoryRule {
  category: ReasonCategory
  pattern: RegExp
}

/** Ordered rules: the first pattern that matches the FDA reason text wins. */
const RULES: CategoryRule[] = [
  { category: 'Pathogen', pattern: /salmonella|listeria|e\.?\s?coli|hepatitis|norovirus|clostridium|botulinum|cronobacter|shigella|campylobacter|cyclospora|\bmold\b|microbial|bacteria|pathogen/i },
  { category: 'Foreign material', pattern: /foreign (material|matter|object)|\b(plastic|metal|glass|wood|stone|stones|rubber|insect|bone fragments?)\b/i },
  { category: 'Undeclared allergen', pattern: /undeclared|allergen|not declared|does not declare|not listed|omitted from the label|may contain (milk|eggs?|fish|shellfish|tree nuts?|peanuts?|wheat|soy|sesame)/i },
  { category: 'Chemical or toxin', pattern: /chemical|toxin|pesticide|\b(lead|arsenic|cadmium|mercury|histamine|aflatoxin)\b|ethylene oxide|sanitizer|cleaning solution/i },
  { category: 'Labeling or packaging', pattern: /mislabel|label|packag|seal|swollen|leak/i },
]

/**
 * Derives a short display category from the free-text FDA reason.
 * Returns null when no rule matches so the UI shows nothing rather than a guess.
 */
export function categorizeReason(reason: string): ReasonCategory | null {
  const matched = RULES.find(rule => rule.pattern.test(reason))
  return matched ? matched.category : null
}
