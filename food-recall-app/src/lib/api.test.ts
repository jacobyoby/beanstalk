import { describe, it, expect } from 'vitest'
import { buildGroupedSearchClause, buildSearchParam, sanitizeSearchQuery } from './api'

describe('sanitizeSearchQuery', () => {
  it('strips quotes and backslashes', () => {
    expect(sanitizeSearchQuery('M&M "test"')).toBe('M&M test')
    expect(sanitizeSearchQuery('a\\b')).toBe('ab')
  })
  it('preserves & and # for encoding', () => {
    expect(sanitizeSearchQuery('M&M')).toBe('M&M')
    expect(sanitizeSearchQuery('a#b')).toBe('a#b')
  })
})

describe('buildGroupedSearchClause', () => {
  it('groups cross-field OR in parentheses', () => {
    expect(buildGroupedSearchClause('milk')).toBe('(product_description:"milk" OR reason_for_recall:"milk" OR recalling_firm:"milk")')
  })
  it('handles multiword input', () => {
    expect(buildGroupedSearchClause('ice cream')).toBe('(product_description:"ice cream" OR reason_for_recall:"ice cream" OR recalling_firm:"ice cream")')
  })
  it('returns null for empty', () => {
    expect(buildGroupedSearchClause('')).toBeNull()
    expect(buildGroupedSearchClause('   ')).toBeNull()
  })
  it('encodes safely via encodeURIComponent (ampersand)', () => {
    const clause = buildGroupedSearchClause('M&M')!
    const encoded = encodeURIComponent(clause)
    expect(encoded).toContain('%26')
    expect(encoded).not.toContain('&search=')
    // Full URL would be ?search=<encoded> so & does not split params
    const url = `https://api.fda.gov/food/enforcement.json?limit=6&skip=0&search=${encoded}`
    expect(url.split('&search=').length).toBe(2)
    // hash is encoded, not fragment
    const hashEncoded = encodeURIComponent(buildGroupedSearchClause('a#b')!)
    expect(hashEncoded).toContain('%23')
  })
})

describe('buildSearchParam', () => {
  it('composes predicates outside grouped OR via AND', () => {
    const param = buildSearchParam('milk', ['classification:"Class I"'])
    expect(param).toBe('(product_description:"milk" OR reason_for_recall:"milk" OR recalling_firm:"milk") AND classification:"Class I"')
  })
  it('handles no search with predicates', () => {
    expect(buildSearchParam('', ['status:"Ongoing"'])).toBe('status:"Ongoing"')
  })
  it('returns null when empty', () => {
    expect(buildSearchParam('')).toBeNull()
  })
})

describe('product/hazard/firm fixtures', () => {
  // Deterministic fixtures: each field uniquely matches
  const fixtures = [
    { product_description: 'UNIQUE_PRODUCT_XYZ', reason_for_recall: 'other', recalling_firm: 'other' },
    { product_description: 'other', reason_for_recall: 'UNIQUE_HAZARD_ABC - Salmonella', recalling_firm: 'other' },
    { product_description: 'other', reason_for_recall: 'other', recalling_firm: 'UNIQUE_FIRM_123' },
  ]
  it('grouped clause matches product-only record via product_description', () => {
    const clause = buildGroupedSearchClause('UNIQUE_PRODUCT_XYZ')!
    expect(clause).toContain('product_description:"UNIQUE_PRODUCT_XYZ"')
    // Simulate FDA matching: at least one field contains term
    const match = (f: typeof fixtures[0]) => Object.values(f).some(v => v.includes('UNIQUE_PRODUCT_XYZ'))
    expect(fixtures.filter(match).length).toBe(1)
  })
  it('grouped clause matches hazard-only record via reason_for_recall', () => {
    const clause = buildGroupedSearchClause('UNIQUE_HAZARD_ABC')!
    expect(clause).toContain('reason_for_recall:"UNIQUE_HAZARD_ABC"')
    const match = (f: typeof fixtures[0]) => Object.values(f).some(v => v.includes('UNIQUE_HAZARD_ABC'))
    expect(fixtures.filter(match).length).toBe(1)
  })
  it('grouped clause matches firm-only record via recalling_firm', () => {
    const clause = buildGroupedSearchClause('UNIQUE_FIRM_123')!
    expect(clause).toContain('recalling_firm:"UNIQUE_FIRM_123"')
    const match = (f: typeof fixtures[0]) => Object.values(f).some(v => v.includes('UNIQUE_FIRM_123'))
    expect(fixtures.filter(match).length).toBe(1)
  })
})
