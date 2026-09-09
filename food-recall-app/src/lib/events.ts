import type { AdverseEvent, AdverseEventProduct, AdverseEventConsumer } from '../types/event'
import { mockEvents } from './mockEvents'
import { sanitizeSearchQuery, isDemoMode, type FetchError } from './api'

interface OpenFDAEventRecord {
  report_number?: string
  date_started?: string
  date_created?: string
  outcomes?: unknown
  reactions?: unknown
  products?: unknown
  consumer?: {
    age?: string
    age_unit?: string
    gender?: string
  }
}

interface OpenFDAProduct {
  name_brand?: string
  industry_code?: string
  industry_name?: string
  role?: string
}

const EVENT_CACHE_KEY = 'ponder:openfda:event:cache'
const EVENT_SYNC_KEY = 'ponder:openfda:event:lastSynced'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 8000

interface CacheEntry {
  key: string
  data: { events: AdverseEvent[]; total: number }
  timestamp: number
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map(s => s.trim())
}

function mapProduct(p: OpenFDAProduct): AdverseEventProduct {
  return {
    nameBrand: typeof p.name_brand === 'string' ? p.name_brand : '',
    industryCode: typeof p.industry_code === 'string' ? p.industry_code : '',
    industryName: typeof p.industry_name === 'string' ? p.industry_name : '',
    role: typeof p.role === 'string' ? p.role : '',
  }
}

function mapConsumer(c?: OpenFDAEventRecord['consumer']): AdverseEventConsumer {
  if (!c || typeof c !== 'object') return { age: '', ageUnit: '', gender: '' }
  return {
    age: typeof c.age === 'string' ? c.age : '',
    ageUnit: typeof c.age_unit === 'string' ? c.age_unit : '',
    gender: typeof c.gender === 'string' ? c.gender : '',
  }
}

function stableEventId(r: OpenFDAEventRecord): string {
  if (r.report_number && typeof r.report_number === 'string') return r.report_number
  const products = Array.isArray(r.products) ? (r.products as OpenFDAProduct[]) : []
  const brand = products.map(p => p.name_brand || '').join(',')
  const reactions = asStringArray(r.reactions).join(',')
  const key = `${r.date_started || ''}|${brand}|${reactions}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return `ae-${Math.abs(hash).toString(36)}`
}

export function mapOpenFDAEvent(r: OpenFDAEventRecord): AdverseEvent | null {
  if (!r || typeof r !== 'object') return null
  const productsRaw = Array.isArray(r.products) ? (r.products as OpenFDAProduct[]) : []
  return {
    id: stableEventId(r),
    reportNumber: typeof r.report_number === 'string' ? r.report_number : '',
    dateStarted: typeof r.date_started === 'string' ? r.date_started : (typeof r.date_created === 'string' ? r.date_created : ''),
    dateCreated: typeof r.date_created === 'string' ? r.date_created : '',
    outcomes: asStringArray(r.outcomes),
    reactions: asStringArray(r.reactions),
    products: productsRaw.map(mapProduct),
    consumer: mapConsumer(r.consumer),
  }
}

/**
 * Build search clause for adverse events across product brand, reactions, and outcomes.
 */
export function buildEventSearchClause(search: string): string | null {
  const sanitized = sanitizeSearchQuery(search)
  if (!sanitized) return null
  const fields = ['products.name_brand', 'reactions', 'outcomes']
  const inner = fields.map(f => `${f}:"${sanitized}"`).join(' OR ')
  return `(${inner})`
}

export function buildEventSearchParam(search: string, predicates: string[] = []): string | null {
  const grouped = buildEventSearchClause(search)
  const parts: string[] = []
  if (grouped) parts.push(grouped)
  parts.push(...predicates.filter(Boolean))
  if (parts.length === 0) return null
  return parts.join(' AND ')
}

function getCacheEntry(cacheKey: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(EVENT_CACHE_KEY)
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

function setCache(cacheKey: string, data: { events: AdverseEvent[]; total: number }): void {
  try {
    const raw = localStorage.getItem(EVENT_CACHE_KEY)
    const entries: CacheEntry[] = raw ? JSON.parse(raw) : []
    const filtered = entries.filter(e => e.key !== cacheKey)
    filtered.unshift({ key: cacheKey, data, timestamp: Date.now() })
    localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(filtered.slice(0, 20)))
    localStorage.setItem(EVENT_SYNC_KEY, new Date().toISOString())
  } catch {}
}

export function getEventLastSynced(): string | null {
  try {
    return localStorage.getItem(EVENT_SYNC_KEY)
  } catch {
    return null
  }
}

export function clearEventCache(): void {
  try {
    localStorage.removeItem(EVENT_CACHE_KEY)
    localStorage.removeItem(EVENT_SYNC_KEY)
  } catch {}
}

export type EventFetchResult = {
  events: AdverseEvent[]
  total: number
  error: FetchError | null
  isStale: boolean
  lastSynced: string | null
  isDemo: boolean
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS, outerSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort()
    else outerSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }
  try {
    return await fetch(url, { signal: controller.signal })
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

export function eventSearchText(event: AdverseEvent): string {
  const brands = event.products.map(p => p.nameBrand).join(' ')
  return `${brands} ${event.reactions.join(' ')} ${event.outcomes.join(' ')} ${event.reportNumber}`
}

export function matchesEventLocally(event: AdverseEvent, search: string): boolean {
  const q = sanitizeSearchQuery(search).toLowerCase()
  if (!q) return true
  return eventSearchText(event).toLowerCase().includes(q)
}

export async function fetchAdverseEvents(params?: {
  search?: string
  limit?: number
  skip?: number
  signal?: AbortSignal
}): Promise<EventFetchResult> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = params?.search || ''
  const searchParam = buildEventSearchParam(search)
  const cappedSkip = Math.min(skip, 25000)
  if (cappedSkip !== skip) {
    return {
      events: [],
      total: 0,
      error: { code: 'BAD_REQUEST', message: 'Skip exceeds FDA limit 25,000 — narrow filters', status: 400, retryable: false },
      isStale: false,
      lastSynced: getEventLastSynced(),
      isDemo: false,
    }
  }

  const cacheKey = `event|${sanitizeSearchQuery(search)}|${limit}|${cappedSkip}`
  const cachedEntry = getCacheEntry(cacheKey)
  const cached = cachedEntry?.data ?? null
  const demo = isDemoMode()

  if (demo) {
    let filtered = mockEvents.map(e => ({
      ...e,
      reportNumber: e.reportNumber.startsWith('DEMO-') ? e.reportNumber : `DEMO-${e.reportNumber}`,
      products: e.products.map(p => ({
        ...p,
        nameBrand: p.nameBrand.startsWith('DEMO ') ? p.nameBrand : `DEMO — Fictional — ${p.nameBrand}`,
      })),
    }))
    if (search) filtered = filtered.filter(e => matchesEventLocally(e, search))
    const total = filtered.length
    const paged = filtered.slice(cappedSkip, cappedSkip + limit)
    return { events: paged, total, error: null, isStale: false, lastSynced: getEventLastSynced(), isDemo: true }
  }

  try {
    if (params?.signal?.aborted) {
      return {
        events: [],
        total: 0,
        error: { code: 'NETWORK', message: 'Aborted', retryable: false },
        isStale: false,
        lastSynced: getEventLastSynced(),
        isDemo: false,
      }
    }

    const isBrowser = typeof window !== 'undefined' && window.location.origin !== 'null'
    const proxyBase = isBrowser ? `${window.location.origin}/api/food/event.json` : 'https://api.fda.gov/food/event.json'
    const directBase = 'https://api.fda.gov/food/event.json'
    let url = `${proxyBase}?limit=${limit}&skip=${cappedSkip}&sort=date_started:desc`
    if (searchParam) url += `&search=${encodeURIComponent(searchParam)}`

    let res: Response
    try {
      res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, params?.signal)
      if (!res.ok && res.status === 404 && proxyBase !== directBase && isBrowser) {
        const directUrl = `${directBase}?limit=${limit}&skip=${cappedSkip}&sort=date_started:desc${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`
        res = await fetchWithTimeout(directUrl, FETCH_TIMEOUT_MS, params?.signal)
      }
    } catch (e) {
      if (isBrowser && proxyBase !== directBase && !(e instanceof DOMException && (e as DOMException).name === 'AbortError')) {
        const directUrl = `${directBase}?limit=${limit}&skip=${cappedSkip}&sort=date_started:desc${searchParam ? `&search=${encodeURIComponent(searchParam)}` : ''}`
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
        setCache(cacheKey, { events: [], total: 0 })
        return { events: [], total: 0, error: null, isStale: false, lastSynced: getEventLastSynced(), isDemo: false }
      }
      if (cached && cachedEntry) {
        return {
          events: cached.events,
          total: cached.total,
          error: err,
          isStale: true,
          lastSynced: new Date(cachedEntry.timestamp).toISOString(),
          isDemo: false,
        }
      }
      return { events: [], total: 0, error: err, isStale: false, lastSynced: getEventLastSynced(), isDemo: false }
    }

    const raw = await res.json()
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { results?: unknown }).results)) {
      const err: FetchError = { code: 'MALFORMED', message: 'Malformed FDA response: missing results array', retryable: true }
      if (cached && cachedEntry) {
        return {
          events: cached.events,
          total: cached.total,
          error: err,
          isStale: true,
          lastSynced: new Date(cachedEntry.timestamp).toISOString(),
          isDemo: false,
        }
      }
      return { events: [], total: 0, error: err, isStale: false, lastSynced: getEventLastSynced(), isDemo: false }
    }

    const data = raw as { results: OpenFDAEventRecord[]; meta?: { results?: { total?: unknown } } }
    const mapped = data.results.map(mapOpenFDAEvent).filter((e): e is AdverseEvent => e !== null)
    const seen = new Set<string>()
    const events: AdverseEvent[] = []
    for (const e of mapped) {
      if (!seen.has(e.id)) {
        seen.add(e.id)
        events.push(e)
      }
    }
    const total = typeof data.meta?.results?.total === 'number' ? data.meta.results.total : events.length
    setCache(cacheKey, { events, total })
    return { events, total, error: null, isStale: false, lastSynced: getEventLastSynced(), isDemo: false }
  } catch (e: unknown) {
    const isAbort = e instanceof DOMException && e.name === 'AbortError'
    const err: FetchError = isAbort
      ? { code: 'TIMEOUT', message: 'Request timed out', retryable: true }
      : { code: 'NETWORK', message: e instanceof Error ? e.message : 'Network error', retryable: true }
    if (cached && cachedEntry) {
      return {
        events: cached.events,
        total: cached.total,
        error: err,
        isStale: true,
        lastSynced: new Date(cachedEntry.timestamp).toISOString(),
        isDemo: false,
      }
    }
    return { events: [], total: 0, error: err, isStale: false, lastSynced: getEventLastSynced(), isDemo: false }
  }
}

/** Convenience for related-events lookup from a recall product description. */
export async function fetchRelatedEvents(productHint: string, signal?: AbortSignal): Promise<EventFetchResult> {
  const terms = productHint
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3)
    .slice(0, 4)
  const search = terms.join(' ')
  if (!search) {
    return { events: [], total: 0, error: null, isStale: false, lastSynced: getEventLastSynced(), isDemo: isDemoMode() }
  }
  return fetchAdverseEvents({ search, limit: 6, skip: 0, signal })
}