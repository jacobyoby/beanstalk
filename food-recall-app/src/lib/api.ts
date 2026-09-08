import type { Recall, RecallClassification } from '../types/recall'
import { mockRecalls } from './mockData'
import { buildDietaryPredicate, matchesDietaryConcerns, type DietaryConcern } from './dietary'

interface OpenFDARecord {
  recall_number?: string
  event_id?: string
  product_description?: string
  reason_for_recall?: string
  classification?: RecallClassification
  status?: string
  distribution_pattern?: string
  recalling_firm?: string
  city?: string
  state?: string
  country?: string
  recall_initiation_date?: string
  report_date?: string
  product_type?: string
  code_info?: string
  more_code_info?: string
  voluntary_mandated?: string
  address_1?: string
  address_2?: string
  postal_code?: string
  center_classification_date?: string
  initial_firm_notification?: string
  product_quantity?: string
  termination_date?: string
}

function mapOpenFDA(r: OpenFDARecord): Recall {
  return {
    id: r.recall_number || r.event_id || Math.random().toString(36).slice(2),
    recallNumber: r.recall_number || '',
    eventId: r.event_id || '',
    productDescription: r.product_description || '',
    reasonForRecall: r.reason_for_recall || '',
    classification: r.classification || 'Class II',
    status: r.status || 'Ongoing',
    distributionPattern: r.distribution_pattern || '',
    recallingFirm: r.recalling_firm || '',
    city: r.city || '',
    state: r.state || '',
    country: r.country || 'United States',
    recallInitiationDate: r.recall_initiation_date || r.report_date || '',
    productType: r.product_type || 'Food',
    codeInfo: r.code_info || '',
    moreCodeInfo: r.more_code_info || '',
    voluntaryMandated: r.voluntary_mandated || '',
    address1: r.address_1 || '',
    address2: r.address_2 || '',
    postalCode: r.postal_code || '',
    centerClassificationDate: r.center_classification_date || '',
    initialFirmNotification: r.initial_firm_notification || '',
    productQuantity: r.product_quantity || '',
    terminationDate: r.termination_date || '',
  }
}

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/["\\]/g, '').trim()
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

export function matchesDistributionPattern(distributionPattern: string, selectedState: string): boolean {
  if (!selectedState) return true
  const pattern = distributionPattern.toLowerCase()
  if (!pattern || pattern.trim() === '') return false // unclear, not matching specific state
  // Nationwide is potentially relevant to any state
  if (pattern.includes('nationwide') || pattern.includes('national distribution') || pattern.includes('nationwide -')) {
    return true
  }
  if (selectedState === 'Nationwide') {
    return pattern.includes('nationwide') || pattern.includes('national')
  }
  // Bounded abbreviation match: \bCA\b etc. (case-sensitive for abbreviations to avoid matching English words like "in" for IN)
  const abbr = selectedState
  const full = STATE_NAMES[selectedState] || ''
  const abbrRegex = new RegExp(`\\b${abbr}\\b`)
  if (abbrRegex.test(distributionPattern)) return true
  if (full && new RegExp(`\\b${full}\\b`, 'i').test(distributionPattern)) return true
  return false
}

export function isDistributionUnclear(distributionPattern: string): boolean {
  const p = distributionPattern.trim().toLowerCase()
  if (!p) return true
  if (p === 'n/a' || p === 'unknown' || p.includes('direct to consumer') || p.includes('retail only')) {
    // Consider ambiguous/region-only as unclear if no state abbreviation or nationwide present
    const hasState = Object.keys(STATE_NAMES).some(abbr => new RegExp(`\\b${abbr}\\b`, 'i').test(distributionPattern) || new RegExp(`\\b${STATE_NAMES[abbr]}\\b`, 'i').test(distributionPattern))
    const hasNationwide = p.includes('nationwide') || p.includes('national')
    return !hasState && !hasNationwide
  }
  return false
}

/**
 * Build the cross-field OR clause grouped in parentheses.
 */
export function buildGroupedSearchClause(search: string): string | null {
  const sanitized = sanitizeSearchQuery(search)
  if (!sanitized) return null
  const fields = ['product_description', 'reason_for_recall', 'recalling_firm']
  const inner = fields.map(f => `${f}:"${sanitized}"`).join(' OR ')
  return `(${inner})`
}

/**
 * Build the full search= value with grouped OR and optional predicates composed outside via AND.
 */
export function buildSearchParam(search: string, predicates: string[] = []): string | null {
  const grouped = buildGroupedSearchClause(search)
  const parts: string[] = []
  if (grouped) parts.push(grouped)
  parts.push(...predicates.filter(Boolean))
  if (parts.length === 0) return null
  return parts.join(' AND ')
}

const CACHE_KEY = 'ponder:openfda:cache'
const SYNC_KEY = 'ponder:openfda:lastSynced'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h

interface CacheEntry {
  key: string
  data: { recalls: Recall[]; total: number }
  timestamp: number
}

function getCache(cacheKey: string): { recalls: Recall[]; total: number } | null {
  const entry = getCacheEntry(cacheKey)
  return entry ? entry.data : null
}

function getCacheEntry(cacheKey: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entries: CacheEntry[] = JSON.parse(raw)
    const hit = entries.find(e => e.key === cacheKey)
    if (!hit) return null
    if (Date.now() - hit.timestamp > CACHE_TTL_MS) return null
    return hit
  } catch {
    return null
  }
}

function setCache(cacheKey: string, data: { recalls: Recall[]; total: number }): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const entries: CacheEntry[] = raw ? JSON.parse(raw) : []
    const filtered = entries.filter(e => e.key !== cacheKey)
    filtered.unshift({ key: cacheKey, data, timestamp: Date.now() })
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered.slice(0, 20)))
    localStorage.setItem(SYNC_KEY, new Date().toISOString())
  } catch {}
}

export function getLastSynced(): string | null {
  try {
    return localStorage.getItem(SYNC_KEY)
  } catch {
    return null
  }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(SYNC_KEY)
  } catch {}
}

export function isDemoMode(): boolean {
  try {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    if (params.get('demo') === '1' || params.get('demo') === 'true') return true
    if (localStorage.getItem('ponder:demo') === '1') return true
    if ((import.meta as unknown as { env: Record<string, string> }).env?.VITE_DEMO === 'true') return true
  } catch {}
  return false
}

export type FetchError = {
  code: 'NOT_FOUND' | 'RATE_LIMIT' | 'TIMEOUT' | 'NETWORK' | 'SERVER' | 'BAD_REQUEST' | 'MALFORMED'
  message: string
  status?: number
  retryable: boolean
}

export type FetchResult = {
  recalls: Recall[]
  total: number
  error: FetchError | null
  isStale: boolean
  lastSynced: string | null
  isDemo: boolean
}

const FETCH_TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS, outerSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort()
    else outerSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

function parseErrorCode(status: number, body: unknown): FetchError {
  const msg = typeof body === 'object' && body !== null && 'error' in body
    ? String((body as { error: { message?: string } }).error.message || '')
    : ''
  if (status === 404 && /no matches/i.test(msg)) {
    return { code: 'NOT_FOUND', message: 'No matches found', status, retryable: false }
  }
  if (status === 429) return { code: 'RATE_LIMIT', message: 'Rate limited — retry shortly', status, retryable: true }
  if (status === 400) return { code: 'BAD_REQUEST', message: msg || 'Bad request', status, retryable: false }
  if (status >= 500) return { code: 'SERVER', message: msg || `Server error ${status}`, status, retryable: true }
  return { code: 'SERVER', message: msg || `Request failed ${status}`, status, retryable: status >= 500 || status === 429 }
}

export async function fetchRecalls(params?: {
  search?: string
  limit?: number
  skip?: number
  classification?: string
  status?: string
  state?: string
  dietary?: string[]
  signal?: AbortSignal
}): Promise<FetchResult> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = params?.search || ''
  const classification = params?.classification || ''
  const status = params?.status || ''
  const state = params?.state || ''
  const dietary = params?.dietary || []
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_OPENFDA_KEY
  const predicates: string[] = []
  if (classification) predicates.push(`classification:"${sanitizeSearchQuery(classification)}"`)
  if (status) predicates.push(`status:"${sanitizeSearchQuery(status)}"`)
  if (state) {
    if (state === 'Nationwide') {
      predicates.push(`distribution_pattern:"Nationwide"`)
    } else {
      predicates.push(`(distribution_pattern:"${sanitizeSearchQuery(state)}" OR distribution_pattern:"Nationwide" OR distribution_pattern:"national")`)
    }
  }
  if (dietary.length > 0) {
    const dp = buildDietaryPredicate(dietary as DietaryConcern[])
    if (dp) predicates.push(dp)
  }
  const searchParam = buildSearchParam(search, predicates)
  const dietaryKey = (dietary as string[]).join(',')
  const cacheKey = `${sanitizeSearchQuery(search)}|${classification}|${status}|${state}|${dietaryKey}|${limit}|${skip}`
  const cachedEntry = getCacheEntry(cacheKey)
  const cached = cachedEntry?.data ?? null
  const demo = isDemoMode()

  // Demo mode: explicit, conspicuously fictional data — filter before slicing
  if (demo) {
    const q = sanitizeSearchQuery(search).toLowerCase()
    let filtered = mockRecalls.map(r => ({
      ...r,
      productDescription: `DEMO — Fictional — ${r.productDescription}`,
      recallNumber: `DEMO-${r.recallNumber}`,
    }))
    if (q) {
      filtered = filtered.filter(r =>
        `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`.toLowerCase().includes(q)
      )
    }
    if (classification) filtered = filtered.filter(r => r.classification === classification)
    if (status) filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase())
    if (state) filtered = filtered.filter(r => matchesDistributionPattern(r.distributionPattern, state))
    if (dietary.length > 0) filtered = filtered.filter(r => matchesDietaryConcerns(r, dietary as DietaryConcern[]))
    const total = filtered.length
    const paged = filtered.slice(skip, skip + limit)
    return { recalls: paged, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: true }
  }

  try {
    if (params?.signal?.aborted) {
      const err: FetchError = { code: 'NETWORK', message: 'Aborted', retryable: false }
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
    }
    let url = `https://api.fda.gov/food/enforcement.json?limit=${limit}&skip=${skip}&sort=report_date:desc`
    if (searchParam) {
      url += `&search=${encodeURIComponent(searchParam)}`
    }
    if (apiKey) url += `&api_key=${encodeURIComponent(apiKey)}`

    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, params?.signal)
    if (!res.ok) {
      let body: unknown = null
      try { body = await res.json() } catch { body = null }
      const err = parseErrorCode(res.status, body)
      if (err.code === 'NOT_FOUND') {
        // Genuine empty — not an error, cache empty result
        setCache(cacheKey, { recalls: [], total: 0 })
        return { recalls: [], total: 0, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: false }
      }
      // For retryable errors, return stale cache if available with label
      if (cached && cachedEntry) {
        return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false }
      }
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
    }
    const data = await res.json()
    if (!data || !Array.isArray(data.results)) {
      const err: FetchError = { code: 'MALFORMED', message: 'Malformed FDA response', retryable: true }
      if (cached && cachedEntry) return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false }
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
    }
    const recalls: Recall[] = data.results.map(mapOpenFDA)
    const total = data.meta?.results?.total ?? recalls.length
    setCache(cacheKey, { recalls, total })
    return { recalls, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: false }
  } catch (e: unknown) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    const err: FetchError = isAbort
      ? { code: 'TIMEOUT', message: 'Request timed out', retryable: true }
      : { code: 'NETWORK', message: e instanceof Error ? e.message : 'Network error', retryable: true }
    if (cached && cachedEntry) {
      return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false }
    }
    return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
  }
}
