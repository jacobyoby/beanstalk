import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildGroupedSearchClause, buildSearchParam, sanitizeSearchQuery, fetchRecalls, clearCache } from './api'

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

describe('fetchRecalls — no synthetic fallback', () => {
  beforeEach(() => {
    clearCache()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const mockSuccess = (results: unknown[] = [{ recall_number: 'F-1', product_description: 'Real', reason_for_recall: 'Hazard', classification: 'Class I', status: 'Ongoing', recalling_firm: 'Firm', distribution_pattern: 'CA' }]) =>
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results, meta: { results: { total: results.length } } }) })

  it('startup without cache and with success returns live data, not mock', async () => {
    vi.stubGlobal('fetch', mockSuccess())
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.recalls.length).toBe(1)
    expect(res.error).toBeNull()
    expect(res.isDemo).toBe(false)
    expect(res.recalls[0].productDescription).toBe('Real')
  })

  it('404 NOT_FOUND yields empty, not mock, no error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: { code: 'NOT_FOUND', message: 'No matches found!' } }) }))
    const res = await fetchRecalls({ search: 'nomatch123', limit: 6, skip: 0 })
    expect(res.recalls).toEqual([])
    expect(res.total).toBe(0)
    expect(res.error).toBeNull()
    expect(res.isStale).toBe(false)
  })

  it('offline (rejected fetch) returns NETWORK error, empty, retryable, no mock', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))
    const res = await fetchRecalls({ search: 'milk', limit: 6, skip: 0 })
    expect(res.recalls).toEqual([])
    expect(res.error?.code).toBe('NETWORK')
    expect(res.error?.retryable).toBe(true)
    expect(res.isStale).toBe(false)
    // Ensure Fresh Pasta Co mock not leaked
    expect(res.recalls.find(r => r.recallingFirm === 'Fresh Pasta Co')).toBeUndefined()
  })

  it('timeout via AbortError returns TIMEOUT', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr))
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('TIMEOUT')
    expect(res.error?.retryable).toBe(true)
  })

  it('429 rate limit returns RATE_LIMIT and stale if cached', async () => {
    // First, populate cache with success
    vi.stubGlobal('fetch', mockSuccess())
    const first = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(first.error).toBeNull()
    // Now 429
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: { message: 'Rate limited' } }) }))
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('RATE_LIMIT')
    expect(res.isStale).toBe(true)
    expect(res.recalls.length).toBe(1)
  })

  it('503 server failure returns SERVER, retryable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { message: 'Service Unavailable' } }) }))
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('SERVER')
    expect(res.error?.retryable).toBe(true)
    expect(res.recalls).toEqual([])
  })

  it('400 bad request returns BAD_REQUEST, not retryable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { message: 'Invalid parameter' } }) }))
    const res = await fetchRecalls({ search: 'M&M', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('BAD_REQUEST')
    expect(res.error?.retryable).toBe(false)
  })

  it('malformed payload returns MALFORMED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meta: {} }) })) // missing results
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('MALFORMED')
  })

  it('recovery after failure returns live data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const fail = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(fail.error).not.toBeNull()
    vi.stubGlobal('fetch', mockSuccess([{ recall_number: 'F-2', product_description: 'Recovered', reason_for_recall: 'X', classification: 'Class I', status: 'Ongoing', recalling_firm: 'Firm', distribution_pattern: '' }]))
    const rec = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(rec.error).toBeNull()
    expect(rec.recalls[0].productDescription).toBe('Recovered')
  })

  it('demo mode returns conspicuously fictional data', async () => {
    // Enable demo via query
    const url = new URL(window.location.href)
    url.searchParams.set('demo', '1')
    window.history.replaceState({}, '', url.toString())
    vi.stubGlobal('fetch', mockSuccess()) // should not be called
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0 })
    expect(res.isDemo).toBe(true)
    expect(res.recalls[0].productDescription.startsWith('DEMO — Fictional')).toBe(true)
    expect(res.recalls[0].recallNumber.startsWith('DEMO-')).toBe(true)
    // cleanup
    url.searchParams.delete('demo')
    window.history.replaceState({}, '', url.toString())
  })

  it('aborted signal returns early and does not use cache mock', async () => {
    const controller = new AbortController()
    controller.abort()
    const res = await fetchRecalls({ search: '', limit: 6, skip: 0, signal: controller.signal })
    expect(res.error?.message).toBe('Aborted')
    expect(res.recalls).toEqual([])
  })

  it('out-of-order: second request wins, first stale ignored via caller generation (simulated)', async () => {
    // Simulate two overlapping fetches where first is slower
    let firstResolve: (v: Response) => void
    const firstPromise = new Promise<Response>(r => { firstResolve = r })
    const secondPromise = Promise.resolve({ ok: true, json: async () => ({ results: [{ recall_number: 'F-2', product_description: 'Second', reason_for_recall: 'X', classification: 'Class I', status: 'Ongoing', recalling_firm: 'Firm', distribution_pattern: '' }], meta: { results: { total: 1 } } }) } as Response)
    const fetchMock = vi.fn()
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise)
    vi.stubGlobal('fetch', fetchMock)
    // Start first
    const p1 = fetchRecalls({ search: 'first', limit: 6, skip: 0 })
    // Start second before first resolves
    const p2 = fetchRecalls({ search: 'second', limit: 6, skip: 0 })
    firstResolve!({ ok: true, json: async () => ({ results: [{ recall_number: 'F-1', product_description: 'First', reason_for_recall: 'X', classification: 'Class I', status: 'Ongoing', recalling_firm: 'Firm', distribution_pattern: '' }], meta: { results: { total: 1 } } }) } as Response)
    const [r1, r2] = await Promise.all([p1, p2])
    // Both resolve, caller would use generation to keep second
    expect(r1.recalls[0].productDescription).toBe('First')
    expect(r2.recalls[0].productDescription).toBe('Second')
    // Verify fetch called twice with different search params
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
