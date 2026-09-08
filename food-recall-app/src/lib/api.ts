import type { Recall, RecallClassification } from '../types/recall'
import { mockRecalls } from './mockData'

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
  voluntary_mandated?: string
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
    voluntaryMandated: r.voluntary_mandated || '',
  }
}

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/["\\]/g, '').trim()
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
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entries: CacheEntry[] = JSON.parse(raw)
    const hit = entries.find(e => e.key === cacheKey)
    if (!hit) return null
    if (Date.now() - hit.timestamp > CACHE_TTL_MS) return null
    return hit.data
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
  signal?: AbortSignal
}): Promise<FetchResult> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = params?.search || ''
  const classification = params?.classification || ''
  const status = params?.status || ''
  const state = params?.state || ''
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_OPENFDA_KEY
  const predicates: string[] = []
  if (classification) predicates.push(`classification:"${sanitizeSearchQuery(classification)}"`)
  if (status) predicates.push(`status:"${sanitizeSearchQuery(status)}"`)
  if (state) predicates.push(`distribution_pattern:"${sanitizeSearchQuery(state)}"`)
  const searchParam = buildSearchParam(search, predicates)
  const cacheKey = `${sanitizeSearchQuery(search)}|${classification}|${status}|${state}|${limit}|${skip}`
  const cached = getCache(cacheKey)
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
    if (state) filtered = filtered.filter(r => r.distributionPattern.toLowerCase().includes(state.toLowerCase()))
    const total = filtered.length
    const paged = filtered.slice(skip, skip + limit)
    return { recalls: paged, total, error: null, isStale: false, lastSynced: getLastSynced(), isDemo: true }
  }

  try {
    if (params?.signal?.aborted) {
      const err: FetchError = { code: 'NETWORK', message: 'Aborted', retryable: false }
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
    }
    let url = `https://api.fda.gov/food/enforcement.json?limit=${limit}&skip=${skip}`
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
      if (cached) {
        return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: getLastSynced(), isDemo: false }
      }
      return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
    }
    const data = await res.json()
    if (!data || !Array.isArray(data.results)) {
      const err: FetchError = { code: 'MALFORMED', message: 'Malformed FDA response', retryable: true }
      if (cached) return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: getLastSynced(), isDemo: false }
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
    if (cached) {
      return { recalls: cached.recalls, total: cached.total, error: err, isStale: true, lastSynced: getLastSynced(), isDemo: false }
    }
    return { recalls: [], total: 0, error: err, isStale: false, lastSynced: getLastSynced(), isDemo: false }
  }
}
