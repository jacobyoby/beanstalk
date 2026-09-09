import { describe, expect, it } from 'vitest'
import { categorizeReason } from './reasonCategory'

describe('categorizeReason', () => {
  it('classifies pathogen contamination', () => {
    expect(categorizeReason('Potential Listeria monocytogenes contamination')).toBe('Pathogen')
    expect(categorizeReason('Product may be contaminated with E. coli O157:H7')).toBe('Pathogen')
  })

  it('classifies undeclared allergens', () => {
    expect(categorizeReason('Undeclared milk and soy allergens')).toBe('Undeclared allergen')
    expect(categorizeReason('Label does not declare walnuts in English')).toBe('Undeclared allergen')
    expect(categorizeReason('Soba sauce packet, which contains bonito (fish), was not declared on the label')).toBe('Undeclared allergen')
  })

  it('prefers foreign material over the allergen rule when both words appear', () => {
    expect(categorizeReason('May contain pieces of plastic; label also omits allergen statement')).toBe('Foreign material')
  })

  it('classifies chemical hazards and labeling problems', () => {
    expect(categorizeReason('Elevated levels of lead detected')).toBe('Chemical or toxin')
    expect(categorizeReason('Product was mislabeled with the wrong best-by date')).toBe('Labeling or packaging')
  })

  it('returns null when nothing matches', () => {
    expect(categorizeReason('Firm initiated recall')).toBeNull()
    expect(categorizeReason('')).toBeNull()
  })
})
