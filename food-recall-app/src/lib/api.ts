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

function sanitizeSearchQuery(query: string): string {
  return query.replace(/["\\]/g, '').trim()
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
    // keep last 20 entries
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered.slice(0, 20)))
    localStorage.setItem(SYNC_KEY, new Date().toISOString())
  } catch {
    // quota exceeded or SSR — ignore
  }
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

export async function fetchRecalls(params?: {
  search?: string
  limit?: number
  skip?: number
}): Promise<{ recalls: Recall[]; total: number; fromMock: boolean; lastSynced: string | null }> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = sanitizeSearchQuery(params?.search || '')
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_OPENFDA_KEY
  const cacheKey = `${search}|${limit}|${skip}`
  const cached = getCache(cacheKey)
  // Use cache if available (served immediately, still try network below for freshness)
  // For simplicity, return cached if fetch fails — fallback logic covers it

  try {
    let url = `https://api.fda.gov/food/enforcement.json?limit=${limit}&skip=${skip}`
    if (search) {
      const fields = ['product_description', 'reason_for_recall', 'recalling_firm']
      const clause = fields.map(f => `${f}:"${search}"`).join('+OR+')
      url += `&search=${clause}`
    }
    if (apiKey) url += `&api_key=${apiKey}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`FDA ${res.status}`)
    const data = await res.json()
    const recalls: Recall[] = (data.results || []).map(mapOpenFDA)
    const total = data.meta?.results?.total ?? recalls.length
    setCache(cacheKey, { recalls, total })
    return { recalls, total, fromMock: false, lastSynced: getLastSynced() }
  } catch {
    if (cached) return { recalls: cached.recalls, total: cached.total, fromMock: false, lastSynced: getLastSynced() }
    let filtered = mockRecalls
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r =>
        `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`.toLowerCase().includes(q)
      )
    }
    const total = filtered.length
    const paged = filtered.slice(skip, skip + limit)
    return { recalls: paged, total, fromMock: true, lastSynced: getLastSynced() }
  }
}
