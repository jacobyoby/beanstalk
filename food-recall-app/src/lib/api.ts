import type { Recall, RecallClassification } from '../types/recall'
import { mockRecalls, mockFsisRecalls } from './mockData'
import { buildDietaryPredicate, matchesDietaryConcerns, type DietaryConcern } from './dietary'
import {
  fetchFsisRecalls,
  filterFsisRecalls,
  mergeRecallFeeds,
} from './fsis'

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

const KNOWN_CLASSIFICATIONS = new Set(['Class I', 'Class II', 'Class III', 'Not Yet Classified'])

function normalizeClassification(raw?: string): RecallClassification {
  if (!raw || typeof raw !== 'string') return 'Unknown'
  const trimmed = raw.trim()
  if (KNOWN_CLASSIFICATIONS.has(trimmed)) return trimmed as RecallClassification
  if (trimmed === '') return 'Unknown'
  return 'Unknown'
}

function normalizeStatus(raw?: string): string {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') return 'Unknown'
  return raw.trim()
}

function stableId(r: OpenFDARecord): string {
  if (r.recall_number) return r.recall_number
  if (r.event_id) return r.event_id
  // Fallback: deterministic hash from firm + product + reason
  const key = `${r.recalling_firm || ''}|${r.product_description || ''}|${r.reason_for_recall || ''}`
  let hash = 0
  for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash |= 0 }
  return `gen-${Math.abs(hash).toString(36)}`
}

function mapOpenFDA(r: OpenFDARecord): Recall | null {
  if (!r || typeof r !== 'object') return null
  // Preserve missing as unknown, do not invent
  const rawClassification = typeof r.classification === 'string' ? r.classification : undefined
  const rawStatus = typeof r.status === 'string' ? r.status : undefined
  return {
    id: stableId(r),
    source: 'FDA',
    recallNumber: typeof r.recall_number === 'string' ? r.recall_number : '',
    eventId: typeof r.event_id === 'string' ? r.event_id : '',
    productDescription: typeof r.product_description === 'string' ? r.product_description : '',
    reasonForRecall: typeof r.reason_for_recall === 'string' ? r.reason_for_recall : '',
    classification: normalizeClassification(rawClassification),
    status: normalizeStatus(rawStatus),
    distributionPattern: typeof r.distribution_pattern === 'string' ? r.distribution_pattern : '',
    recallingFirm: typeof r.recalling_firm === 'string' ? r.recalling_firm : '',
    city: typeof r.city === 'string' ? r.city : '',
    state: typeof r.state === 'string' ? r.state : '',
    country: typeof r.country === 'string' ? r.country : '',
    recallInitiationDate: typeof r.recall_initiation_date === 'string' ? r.recall_initiation_date : (typeof r.report_date === 'string' ? r.report_date : ''),
    productType: typeof r.product_type === 'string' ? r.product_type : '',
    codeInfo: typeof r.code_info === 'string' ? r.code_info : '',
    moreCodeInfo: typeof r.more_code_info === 'string' ? r.more_code_info : '',
    voluntaryMandated: typeof r.voluntary_mandated === 'string' ? r.voluntary_mandated : '',
    rawClassification,
    rawStatus,
    address1: typeof r.address_1 === 'string' ? r.address_1 : '',
    address2: typeof r.address_2 === 'string' ? r.address_2 : '',
    postalCode: typeof r.postal_code === 'string' ? r.postal_code : '',
    centerClassificationDate: typeof r.center_classification_date === 'string' ? r.center_classification_date : '',
    initialFirmNotification: typeof r.initial_firm_notification === 'string' ? r.initial_firm_notification : '',
    productQuantity: typeof r.product_quantity === 'string' ? r.product_quantity : '',
    terminationDate: typeof r.termination_date === 'string' ? r.termination_date : '',
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
  /** Count of USDA FSIS recalls included after client-side filters. */
  fsisCount?: number
  /** Soft USDA/FSIS error that did not block FDA results. */
  fsisError?: { code: string; message: string; retryable: boolean } | null
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
  const cappedSkip = Math.min(skip, 25000)
  if (cappedSkip !== skip) {
    // Offset beyond FDA limit — return empty with truncated window info, do not request
    return { recalls: [], total: 0, error: { code: 'BAD_REQUEST', message: 'Skip exceeds FDA limit 25,000 — narrow filters', status: 400, retryable: false }, isStale: false, lastSynced: getLastSynced(), isDemo: false }
  }
  const cacheKey = `${sanitizeSearchQuery(search)}|${classification}|${status}|${state}|${dietaryKey}|${limit}|${cappedSkip}`
  const cachedEntry = getCacheEntry(cacheKey)
  const cached = cachedEntry?.data ?? null
  const demo = isDemoMode()

  // Demo mode: explicit, conspicuously fictional data — filter before slicing
  if (demo) {
    const q = sanitizeSearchQuery(search).toLowerCase()
    let filtered = [...mockRecalls, ...mockFsisRecalls].map(r => ({
      ...r,
      productDescription: `DEMO — Fictional — ${r.productDescription}`,
      recallNumber: `DEMO-${r.recallNumber}`,
      headline: r.headline ? `DEMO — Fictional — ${r.headline}` : r.headline,
    }))
    if (q) {
      filtered = filtered.filter(r =>
        `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm} ${r.brand || ''} ${r.headline || ''}`.toLowerCase().includes(q)
      )
    }
    if (classification) filtered = filtered.filter(r => r.classification === classification)
    if (status) filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase())
    if (state) filtered = filtered.filter(r => matchesDistributionPattern(r.distributionPattern, state))
    if (dietary.length > 0) filtered = filtered.filter(r => matchesDietaryConcerns(r, dietary as DietaryConcern[]))
    const total = filtered.length
    const paged = filtered.slice(cappedSkip, cappedSkip + limit)
    const fsisCount = paged.filter(r => r.source === 'USDA').length
    return { recalls: paged, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: true, fsisCount, fsisError: null }
  }

  const fsisPromise = fetchFsisRecalls({ signal: params?.signal }).catch((): Awaited<ReturnType<typeof fetchFsisRecalls>> => ({
    recalls: [],
    error: { code: 'NETWORK', message: 'FSIS unavailable', retryable: true },
    isStale: false,
    fromStatic: false,
  }))

  const withFsis = async (fdaResult: FetchResult): Promise<FetchResult> => {
    // Hard FDA failures with no rows: still surface matching USDA recalls when possible
    const fsis = await fsisPromise
    const filteredFsis = filterFsisRecalls(fsis.recalls, {
      search: sanitizeSearchQuery(search),
      classification,
      status,
      state,
      dietary,
      matchesDistribution: matchesDistributionPattern,
    })
    // Include FSIS on the first page (newest window). Later FDA pages stay FDA-only to avoid dupes.
    const includeFsis = cappedSkip === 0
    const merged = mergeRecallFeeds(fdaResult.recalls, filteredFsis, { includeFsis })
    const fsisCount = includeFsis ? filteredFsis.length : 0
    const total = (fdaResult.total || 0) + (includeFsis ? filteredFsis.length : 0)
    // Prefer FDA error only when FDA produced nothing and FSIS also empty
    if (fdaResult.error && fdaResult.recalls.length === 0 && merged.length > 0) {
      return {
        recalls: merged,
        total: Math.max(total, merged.length),
        error: null,
        isStale: fdaResult.isStale || fsis.isStale,
        lastSynced: fdaResult.lastSynced ?? getLastSynced(),
        isDemo: false,
        fsisCount,
        fsisError: fsis.error,
      }
    }
    return {
      ...fdaResult,
      recalls: merged,
      total: fdaResult.error && merged.length === 0 ? fdaResult.total : total,
      isStale: fdaResult.isStale || (Boolean(fsis.isStale) && includeFsis),
      fsisCount,
      fsisError: fsis.error,
    }
  }

  try {
    if (params?.signal?.aborted) {
      const err: FetchError = { code: 'NETWORK', message: 'Aborted', retryable: false }
      return withFsis({ recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false })
    }
    const isBrowser = typeof window !== 'undefined' && window.location.origin !== 'null'
    const proxyBase = isBrowser ? `${window.location.origin}/api/food/enforcement.json` : 'https://api.fda.gov/food/enforcement.json'
    const directBase = 'https://api.fda.gov/food/enforcement.json'
    let url = `${proxyBase}?limit=${limit}&skip=${cappedSkip}&sort=report_date:desc`
    if (searchParam) {
      url += `&search=${encodeURIComponent(searchParam)}`
    }
    // No api_key in client bundle; server proxy injects OPENFDA_API_KEY when available

    let res: Response
    try {
      res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, params?.signal)
      if (!res.ok && res.status === 404 && proxyBase !== directBase && isBrowser) {
        const directUrl = `${directBase}?limit=${limit}&skip=${cappedSkip}&sort=report_date:desc${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`
        res = await fetchWithTimeout(directUrl, FETCH_TIMEOUT_MS, params?.signal)
      }
    } catch (e) {
      if (isBrowser && proxyBase !== directBase && !(e instanceof DOMException && (e as DOMException).name === 'AbortError')) {
        const directUrl = `${directBase}?limit=${limit}&skip=${cappedSkip}&sort=report_date:desc${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`
        res = await fetchWithTimeout(directUrl, FETCH_TIMEOUT_MS, params?.signal)
      } else {
        throw e
      }
    }
    if (!res.ok) {
      let body: unknown = null
      try { body = await res.json() } catch { body = null }
      const err = parseErrorCode(res.status, body)
      if (err.code === 'NOT_FOUND') {
        // Genuine empty — not an error, cache empty result
        setCache(cacheKey, { recalls: [], total: 0 })
        return withFsis({ recalls: [], total: 0, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: false })
      }
      // For retryable errors, return stale cache if available with label
      if (cached && cachedEntry) {
        return withFsis({ recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false })
      }
      return withFsis({ recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false })
    }
    const raw = await res.json()
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as any).results)) {
      const err: FetchError = { code: 'MALFORMED', message: 'Malformed FDA response: missing results array', retryable: true }
      if (cached && cachedEntry) return withFsis({ recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false })
      return withFsis({ recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false })
    }
    const data = raw as { results: unknown[]; meta?: { results?: { total?: unknown; skip?: unknown; limit?: unknown } } }
    // Validate pagination meta types when present
    if (data.meta?.results) {
      const m = data.meta.results
      if ((m.total !== undefined && typeof m.total !== 'number') || (m.skip !== undefined && typeof m.skip !== 'number') || (m.limit !== undefined && typeof m.limit !== 'number')) {
        const err: FetchError = { code: 'MALFORMED', message: 'Malformed FDA response: invalid pagination meta', retryable: true }
        if (cached && cachedEntry) return withFsis({ recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false })
        return withFsis({ recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false })
      }
    }
    const mapped = (data.results as OpenFDARecord[]).map(mapOpenFDA).filter((r): r is Recall => r !== null)
    // Deduplicate by id, keep first
    const seen = new Set<string>()
    const recalls: Recall[] = []
    for (const r of mapped) { if (!seen.has(r.id)) { seen.add(r.id); recalls.push(r) } }
    const total = typeof data.meta?.results?.total === 'number' ? data.meta.results.total : recalls.length
    setCache(cacheKey, { recalls, total })
    return withFsis({ recalls, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: false })
  } catch (e: unknown) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    const err: FetchError = isAbort
      ? { code: 'TIMEOUT', message: 'Request timed out', retryable: true }
      : { code: 'NETWORK', message: e instanceof Error ? e.message : 'Network error', retryable: true }
    if (cached && cachedEntry) {
      return withFsis({ recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: new Date(cachedEntry.timestamp).toISOString(), isDemo: false })
    }
    return withFsis({ recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false })
  }
}
