import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseFsisRss,
  mapFsisItem,
  toRecallDate,
  filterFsisRecalls,
  mergeRecallFeeds,
  sortRecallsByDateDesc,
  fetchFsisRecalls,
  clearFsisCache,
  parseFsisPayload,
} from './fsis'
import type { Recall } from '../types/recall'
import { matchesWatchlist } from './watchlist'

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Food Recall Notifications</title>
    <item>
      <title>Prairie Packing Co Recalls Ground Beef Products Due to Possible E. coli O157:H7 Contamination</title>
      <link>https://www.fsis.usda.gov/recalls-alerts/001-2026</link>
      <pubDate>Wed, 05 Mar 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[
        <p>Recall Class: Class I</p>
        <p>Product: Ground beef products, 80% lean, 1-lb trays</p>
        <p>Brand: Prairie Fresh</p>
        <p>Hazard: E. coli O157:H7</p>
        <p>Company: Prairie Packing Co</p>
        <p>Distribution: Nationwide</p>
        <p>Quantity: 42,000 pounds</p>
        <p>Establishment Number: M-184</p>
        <p>a Omaha, NE establishment</p>
      ]]></description>
    </item>
    <item>
      <title>Southern Poultry Foods Recalls Chicken Salad Products Due to Possible Listeria Contamination</title>
      <link>https://www.fsis.usda.gov/recalls-alerts/018-2025</link>
      <pubDate>Wed, 12 Nov 2025 12:00:00 GMT</pubDate>
      <description>
        Recall Class: Class I
        Product: Ready-to-eat chicken salad, 12-oz containers
        Hazard: Listeria monocytogenes
        Company: Southern Poultry Foods
        Distribution: GA, FL, SC, AL, TN
        Est. P-9021
      </description>
    </item>
  </channel>
</rss>`

const baseFda = (over: Partial<Recall> = {}): Recall => ({
  id: 'F-1',
  source: 'FDA',
  recallNumber: 'F-1',
  eventId: '1',
  productDescription: 'FDA product',
  reasonForRecall: 'Hazard',
  classification: 'Class I',
  status: 'Ongoing',
  distributionPattern: 'CA',
  recallingFirm: 'Firm',
  city: 'X',
  state: 'CA',
  country: 'United States',
  recallInitiationDate: '20260101',
  productType: 'Food',
  codeInfo: '',
  moreCodeInfo: '',
  voluntaryMandated: '',
  address1: '',
  address2: '',
  postalCode: '',
  centerClassificationDate: '',
  initialFirmNotification: '',
  productQuantity: '',
  terminationDate: '',
  ...over,
})

describe('toRecallDate', () => {
  it('parses RSS pubDate to YYYYMMDD', () => {
    expect(toRecallDate('Wed, 05 Mar 2026 12:00:00 GMT')).toBe('20260305')
  })
  it('passes through YYYYMMDD', () => {
    expect(toRecallDate('20260305')).toBe('20260305')
  })
  it('returns empty for blank', () => {
    expect(toRecallDate('')).toBe('')
  })
})

describe('mapFsisItem / parseFsisRss', () => {
  it('maps structured FSIS RSS item fields', () => {
    const recalls = parseFsisRss(SAMPLE_RSS)
    expect(recalls.length).toBe(2)
    const beef = recalls[0]
    expect(beef.source).toBe('USDA')
    expect(beef.recallNumber).toBe('001-2026')
    expect(beef.id).toBe('USDA-001-2026')
    expect(beef.classification).toBe('Class I')
    expect(beef.productDescription).toContain('Ground beef')
    expect(beef.brand).toBe('Prairie Fresh')
    expect(beef.hazard).toMatch(/E\. coli/i)
    expect(beef.establishmentNumber).toBe('M-184')
    expect(beef.distributionPattern).toMatch(/Nationwide/i)
    expect(beef.recallingFirm).toMatch(/Prairie Packing/i)
    expect(beef.productQuantity).toMatch(/42,000/)
    expect(beef.city).toBe('Omaha')
    expect(beef.state).toBe('NE')
    expect(beef.recallInitiationDate).toBe('20260305')
    expect(beef.detailUrl).toContain('fsis.usda.gov')
  })

  it('returns empty for empty/malformed xml', () => {
    expect(parseFsisRss('')).toEqual([])
    expect(parseFsisRss('<rss></rss>')).toEqual([])
    expect(mapFsisItem('')).toBeNull()
  })

  it('dedupes by id', () => {
    const dup = SAMPLE_RSS.replace('</channel>', `${SAMPLE_RSS.match(/<item[\s\S]*?<\/item>/)![0]}</channel>`)
    const recalls = parseFsisRss(dup)
    const ids = recalls.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('parseFsisPayload', () => {
  it('accepts JSON recalls array wrapper', () => {
    const parsed = parseFsisPayload({ recalls: [baseFda({ id: 'USDA-1', source: 'USDA', recallNumber: '1-2026' })] })
    expect(parsed[0].source).toBe('USDA')
    expect(parsed[0].id).toBe('USDA-1')
  })
})

describe('filterFsisRecalls', () => {
  const recalls = parseFsisRss(SAMPLE_RSS)

  it('filters by search across product/hazard/firm', () => {
    expect(filterFsisRecalls(recalls, { search: 'listeria' }).length).toBe(1)
    expect(filterFsisRecalls(recalls, { search: 'prairie' }).length).toBe(1)
    expect(filterFsisRecalls(recalls, { search: 'no-such' }).length).toBe(0)
  })

  it('filters by classification', () => {
    expect(filterFsisRecalls(recalls, { classification: 'Class I' }).length).toBe(2)
    expect(filterFsisRecalls(recalls, { classification: 'Class III' }).length).toBe(0)
  })

  it('uses injected distribution matcher', () => {
    const match = (pattern: string, state: string) => pattern.includes(state)
    expect(filterFsisRecalls(recalls, { state: 'GA', matchesDistribution: match }).length).toBe(1)
  })
})

describe('mergeRecallFeeds + sort', () => {
  it('merges FDA and USDA sorted by date desc with source tags', () => {
    const fda = [baseFda({ id: 'F-old', recallInitiationDate: '20250101' })]
    const usda = parseFsisRss(SAMPLE_RSS)
    const merged = mergeRecallFeeds(fda, usda)
    expect(merged.some(r => r.source === 'USDA')).toBe(true)
    expect(merged.some(r => r.source === 'FDA')).toBe(true)
    expect(merged[0].recallInitiationDate >= merged[merged.length - 1].recallInitiationDate).toBe(true)
  })

  it('can exclude FSIS', () => {
    const merged = mergeRecallFeeds([baseFda()], parseFsisRss(SAMPLE_RSS), { includeFsis: false })
    expect(merged.every(r => r.source === 'FDA')).toBe(true)
  })

  it('sortRecallsByDateDesc is stable on ties preferring USDA', () => {
    const sorted = sortRecallsByDateDesc([
      baseFda({ id: 'F-a', recallInitiationDate: '20260305' }),
      baseFda({ id: 'USDA-x', source: 'USDA', recallInitiationDate: '20260305' }),
    ])
    expect(sorted[0].source).toBe('USDA')
  })
})

describe('watchlist matches USDA fields', () => {
  it('matches brand and hazard on USDA recalls', () => {
    const beef = parseFsisRss(SAMPLE_RSS)[0]
    const hay = `${beef.productDescription} ${beef.reasonForRecall} ${beef.recallingFirm} ${beef.brand || ''} ${beef.hazard || ''} ${beef.headline || ''}`
    expect(matchesWatchlist(hay, ['prairie fresh'])).toEqual(['prairie fresh'])
    expect(matchesWatchlist(hay, ['e. coli'])).toEqual(['e. coli'])
  })
})

describe('fetchFsisRecalls', () => {
  beforeEach(() => {
    clearFsisCache()
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('parses JSON from /api/fsis/recalls', async () => {
    const payload = { recalls: parseFsisRss(SAMPLE_RSS) }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      })
    )
    const res = await fetchFsisRecalls()
    expect(res.error).toBeNull()
    expect(res.recalls.length).toBe(2)
    expect(res.recalls[0].source).toBe('USDA')
  })

  it('parses RSS XML when content-type is xml', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('/api/fsis/recalls')) {
          return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}), text: async () => '' }
        }
        return {
          ok: true,
          headers: { get: () => 'application/rss+xml' },
          json: async () => ({}),
          text: async () => SAMPLE_RSS,
        }
      })
    )
    const res = await fetchFsisRecalls()
    expect(res.recalls.length).toBe(2)
  })

  it('demo mode returns mock FSIS fixtures', async () => {
    const res = await fetchFsisRecalls({ demo: true })
    expect(res.recalls.length).toBeGreaterThan(0)
    expect(res.recalls.every(r => r.source === 'USDA')).toBe(true)
    expect(res.fromStatic).toBe(true)
  })

  it('soft-fails to empty when all sources fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const res = await fetchFsisRecalls()
    expect(res.recalls).toEqual([])
    expect(res.error?.retryable).toBe(true)
  })
})
