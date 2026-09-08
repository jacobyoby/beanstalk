export type DietaryConcern =
  | 'milk' | 'eggs' | 'fish' | 'crustacean' | 'tree_nuts' | 'peanuts' | 'wheat' | 'soybeans' | 'sesame'
  | 'gluten' | 'vegan' | 'vegetarian' | 'halal' | 'kosher'

export const DIETARY_LABELS: Record<DietaryConcern, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  crustacean: 'Crustacean shellfish',
  tree_nuts: 'Tree nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soybeans: 'Soybeans',
  sesame: 'Sesame',
  gluten: 'Gluten',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  halal: 'Halal',
  kosher: 'Kosher',
}

const DIETARY_TERMS: Record<DietaryConcern, string[]> = {
  milk: ['milk', 'dairy', 'cheese', 'whey', 'casein', 'lactose'],
  eggs: ['egg', 'eggs', 'albumin', 'mayonnaise'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'anchovy'],
  crustacean: ['shellfish', 'shrimp', 'crab', 'lobster', 'crustacean', 'prawn'],
  tree_nuts: ['tree nut', 'almond', 'walnut', 'cashew', 'pecan', 'hazelnut', 'pistachio', 'brazil nut'],
  peanuts: ['peanut', 'peanuts'],
  wheat: ['wheat', 'wheat flour'],
  soybeans: ['soy', 'soya', 'soybean', 'tofu', 'soy sauce'],
  sesame: ['sesame', 'tahini', 'sesame oil'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'malt', 'oats'],
  vegan: ['vegan'],
  vegetarian: ['vegetarian'],
  halal: ['halal'],
  kosher: ['kosher'],
}

const NEGATION_TERMS = ['free', 'without', 'no ', 'not contain', 'does not contain']

function containsNegated(text: string, term: string): boolean {
  const lower = text.toLowerCase()
  const termLower = term.toLowerCase()
  let idx = lower.indexOf(termLower)
  while (idx !== -1) {
    const before = lower.slice(Math.max(0, idx - 30), idx)
    if (NEGATION_TERMS.some(n => before.includes(n))) return true
    idx = lower.indexOf(termLower, idx + 1)
  }
  return false
}

export function getDietaryMatches(recall: { productDescription: string; reasonForRecall: string }, selected: DietaryConcern[]): Array<{ concern: DietaryConcern; field: 'reason' | 'product'; term: string }> {
  const results: Array<{ concern: DietaryConcern; field: 'reason' | 'product'; term: string }> = []
  const reason = recall.reasonForRecall || ''
  const product = recall.productDescription || ''
  for (const concern of selected) {
    const terms = DIETARY_TERMS[concern] || []
    for (const term of terms) {
      const inReason = reason.toLowerCase().includes(term.toLowerCase()) && !containsNegated(reason, term)
      const inProduct = product.toLowerCase().includes(term.toLowerCase()) && !containsNegated(product, term)
      if (inReason) results.push({ concern, field: 'reason', term })
      else if (inProduct) results.push({ concern, field: 'product', term })
    }
  }
  // Deduplicate by concern
  const seen = new Set<string>()
  return results.filter(r => {
    const key = r.concern + ':' + r.field + ':' + r.term
    if (seen.has(r.concern)) return false
    // Keep first match per concern
    if (results.find(x => x.concern === r.concern) !== r) return false
    seen.add(r.concern)
    return true
  })
}

export function matchesDietaryConcerns(recall: { productDescription: string; reasonForRecall: string }, selected: DietaryConcern[]): boolean {
  if (selected.length === 0) return true
  return getDietaryMatches(recall, selected).length > 0
}

export function buildDietaryPredicate(selected: DietaryConcern[]): string | null {
  if (selected.length === 0) return null
  const clauses: string[] = []
  for (const concern of selected) {
    const terms = DIETARY_TERMS[concern] || []
    for (const term of terms) {
      // For FDA, search reason and product_description
      clauses.push(`reason_for_recall:"${term}"`)
      clauses.push(`product_description:"${term}"`)
    }
  }
  if (clauses.length === 0) return null
  return `(${clauses.join(' OR ')})`
}

export function isDietaryUncertain(recall: { productDescription: string; reasonForRecall: string }): boolean {
  return !recall.productDescription && !recall.reasonForRecall
}
