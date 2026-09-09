import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildEventSearchClause,
  buildEventSearchParam,
  mapOpenFDAEvent,
  fetchAdverseEvents,
  clearEventCache,
  matchesEventLocally,
  eventSearchText,
  fetchRelatedEvents,
} from './events'
import { FDA_EVENT_DISCLAIMER } from '../types/event'

describe('FDA_EVENT_DISCLAIMER', () => {
  it('states data is not scientifically verified and not a recall', () => {
    expect(FDA_EVENT_DISCLAIMER.toLowerCase()).toMatch(/not scientifically verified/)
    expect(FDA_EVENT_DISCLAIMER.toLowerCase()).toMatch(/not confirmed recalls|unverified/)
  })
})

describe('buildEventSearchClause', () => {
  it('groups brand, reactions, outcomes OR clause', () => {
    expect(buildEventSearchClause('salmonella')).toBe(
      '(products.name_brand:"salmonella" OR reactions:"salmonella" OR outcomes:"salmonella")'
    )
  })
  it('returns null for empty', () => {
    expect(buildEventSearchClause('')).toBeNull()
    expect(buildEventSearchClause('   ')).toBeNull()
  })
  it('strips quotes via sanitize', () => {
    const clause = buildEventSearchClause('milk "bar"')!
    expect(clause).not.toContain('"milk "bar""')
    expect(clause).toContain('products.name_brand:"milk bar"')
  })
})

describe('buildEventSearchParam', () => {
  it('composes predicates with AND', () => {
    const param = buildEventSearchParam('milk', ['outcomes:"Hospitalization"'])
    expect(param).toBe(
      '(products.name_brand:"milk" OR reactions:"milk" OR outcomes:"milk") AND outcomes:"Hospitalization"'
    )
  })
  it('returns null when empty', () => {
    expect(buildEventSearchParam('')).toBeNull()
  })
})

describe('mapOpenFDAEvent', () => {
  it('maps core CAERS fields', () => {
    const mapped = mapOpenFDAEvent({
      report_number: '12345',
      date_started: '20260301',
      date_created: '20260305',
      outcomes: ['Hospitalization', 'Other Outcome'],
      reactions: ['DIARRHOEA', 'VOMITING'],
      products: [
        { name_brand: 'Acme Milk', industry_code: '09', industry_name: 'Milk', role: 'SUSPECT' },
      ],
      consumer: { age: '40', age_unit: 'year(s)', gender: 'Female' },
    })
    expect(mapped).not.toBeNull()
    expect(mapped!.id).toBe('12345')
    expect(mapped!.reportNumber).toBe('12345')
    expect(mapped!.dateStarted).toBe('20260301')
    expect(mapped!.outcomes).toEqual(['Hospitalization', 'Other Outcome'])
    expect(mapped!.reactions).toEqual(['DIARRHOEA', 'VOMITING'])
    expect(mapped!.products[0].nameBrand).toBe('Acme Milk')
    expect(mapped!.consumer.gender).toBe('Female')
  })

  it('handles missing optional fields safely', () => {
    const mapped = mapOpenFDAEvent({ report_number: 'X-1' })
    expect(mapped).not.toBeNull()
    expect(mapped!.products).toEqual([])
    expect(mapped!.reactions).toEqual([])
    expect(mapped!.outcomes).toEqual([])
    expect(mapped!.consumer.gender).toBe('')
  })

  it('filters non-string reactions/outcomes', () => {
    const mapped = mapOpenFDAEvent({
      report_number: 'X-2',
      reactions: ['OK', 1, null, ''],
      outcomes: [undefined, 'Medically Important'],
    } as never)
    expect(mapped!.reactions).toEqual(['OK'])
    expect(mapped!.outcomes).toEqual(['Medically Important'])
  })

  it('returns null for non-objects', () => {
    expect(mapOpenFDAEvent(null as never)).toBeNull()
  })
})

describe('eventSearchText / matchesEventLocally', () => {
  const sample = mapOpenFDAEvent({
    report_number: 'R-9',
    reactions: ['SALMONELLA INFECTION'],
    outcomes: ['Hospitalization'],
    products: [{ name_brand: 'Green Superfoods Moringa' }],
  })!

  it('builds searchable text', () => {
    const text = eventSearchText(sample)
    expect(text).toContain('Green Superfoods Moringa')
    expect(text).toContain('SALMONELLA')
    expect(text).toContain('Hospitalization')
  })

  it('matches brand and reaction locally', () => {
    expect(matchesEventLocally(sample, 'moringa')).toBe(true)
    expect(matchesEventLocally(sample, 'salmonella')).toBe(true)
    expect(matchesEventLocally(sample, 'peanut')).toBe(false)
  })
})

describe('fetchAdverseEvents', () => {
  beforeEach(() => {
    clearEventCache()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    // ensure demo off
    const url = new URL(window.location.href)
    url.searchParams.delete('demo')
    window.history.replaceState({}, '', url.toString())
    localStorage.removeItem('ponder:demo')
  })

  const mockSuccess = (results: unknown[] = [{
    report_number: 'AE-1',
    date_started: '20260101',
    outcomes: ['Other Outcome'],
    reactions: ['NAUSEA'],
    products: [{ name_brand: 'Real Brand', role: 'SUSPECT' }],
    consumer: { gender: 'Male' },
  }]) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results, meta: { results: { total: results.length } } }),
    })

  it('returns live mapped events', async () => {
    vi.stubGlobal('fetch', mockSuccess())
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    expect(res.error).toBeNull()
    expect(res.isDemo).toBe(false)
    expect(res.events).toHaveLength(1)
    expect(res.events[0].products[0].nameBrand).toBe('Real Brand')
    expect(res.events[0].reportNumber).toBe('AE-1')
  })

  it('builds search URL against event endpoint', async () => {
    const fetchMock = mockSuccess()
    vi.stubGlobal('fetch', fetchMock)
    await fetchAdverseEvents({ search: 'milk', limit: 6, skip: 0 })
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/food/event.json')
    expect(calledUrl).toContain('search=')
    expect(decodeURIComponent(calledUrl)).toContain('products.name_brand:"milk"')
  })

  it('404 NOT_FOUND yields empty without error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'NOT_FOUND', message: 'No matches found!' } }),
    }))
    const res = await fetchAdverseEvents({ search: 'nomatch', limit: 6, skip: 0 })
    expect(res.events).toEqual([])
    expect(res.total).toBe(0)
    expect(res.error).toBeNull()
  })

  it('network failure returns NETWORK error without mock leakage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('NETWORK')
    expect(res.events).toEqual([])
    expect(res.events.find(e => e.reportNumber.startsWith('DEMO'))).toBeUndefined()
  })

  it('429 returns stale cache when available', async () => {
    vi.stubGlobal('fetch', mockSuccess())
    await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limited' } }),
    }))
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('RATE_LIMIT')
    expect(res.isStale).toBe(true)
    expect(res.events).toHaveLength(1)
  })

  it('malformed payload returns MALFORMED', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ meta: {} }) }))
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    expect(res.error?.code).toBe('MALFORMED')
  })

  it('demo mode returns fictional event data', async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('demo', '1')
    window.history.replaceState({}, '', url.toString())
    vi.stubGlobal('fetch', mockSuccess())
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0 })
    expect(res.isDemo).toBe(true)
    expect(res.events.length).toBeGreaterThan(0)
    expect(res.events[0].reportNumber.startsWith('DEMO')).toBe(true)
    url.searchParams.delete('demo')
    window.history.replaceState({}, '', url.toString())
  })

  it('demo mode filters by search', async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('demo', '1')
    window.history.replaceState({}, '', url.toString())
    const res = await fetchAdverseEvents({ search: 'moringa', limit: 6, skip: 0 })
    expect(res.isDemo).toBe(true)
    expect(res.events.every(e => eventSearchText(e).toLowerCase().includes('moringa'))).toBe(true)
    url.searchParams.delete('demo')
    window.history.replaceState({}, '', url.toString())
  })

  it('aborted signal returns early', async () => {
    const controller = new AbortController()
    controller.abort()
    const res = await fetchAdverseEvents({ search: '', limit: 6, skip: 0, signal: controller.signal })
    expect(res.error?.message).toBe('Aborted')
    expect(res.events).toEqual([])
  })
})

describe('fetchRelatedEvents', () => {
  beforeEach(() => {
    clearEventCache()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    const url = new URL(window.location.href)
    url.searchParams.delete('demo')
    window.history.replaceState({}, '', url.toString())
  })

  it('returns empty when product hint has no useful tokens', async () => {
    const res = await fetchRelatedEvents('a b c')
    expect(res.events).toEqual([])
    expect(res.error).toBeNull()
  })

  it('searches using product tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{
          report_number: 'REL-1',
          products: [{ name_brand: 'Jalapeño Peppers' }],
          reactions: ['DIARRHOEA'],
          outcomes: [],
        }],
        meta: { results: { total: 1 } },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await fetchRelatedEvents('Jalapeño Peppers, 1lb bag - Sinaloa Mexico')
    expect(res.events).toHaveLength(1)
    const calledUrl = String(fetchMock.mock.calls[0][0])
    expect(calledUrl).toContain('/food/event.json')
    expect(calledUrl).toContain('search=')
  })
})