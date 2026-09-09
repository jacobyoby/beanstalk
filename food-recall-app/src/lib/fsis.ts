import type { Recall, RecallClassification } from '../types/recall'
import { matchesDietaryConcerns, type DietaryConcern } from './dietary'
import { mockFsisRecalls } from './mockData'

const FSIS_RSS_PATH = '/rss/food-recall-notification-and-destruction-orders-rss-feed.xml'
const FSIS_RSS_URL = `https://www.fsis.usda.gov${FSIS_RSS_PATH}`
/** Same-origin path for a future serverless proxy that returns parsed JSON. */
export const FSIS_API_PATH = '/api/fsis/recalls'
/** Static JSON baked at build time (GitHub Pages / static hosts). */
export const FSIS_STATIC_PATH = 'data/fsis-recalls.json'

const CACHE_KEY = 'ponder:fsis:cache'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h
const FETCH_TIMEOUT_MS = 8000

const KNOWN_CLASSIFICATIONS = new Set(['Class I', 'Class II', 'Class III', 'Not Yet Classified'])

export type FsisFetchResult = {
  recalls: Recall[]
  error: { code: string; message: string; retryable: boolean } | null
  isStale: boolean
  fromStatic: boolean
}

interface CacheEntry {
  data: Recall[]
  timestamp: number
}

function getCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (!entry || !Array.isArray(entry.data)) return null
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
    return entry
  } catch {
    return null
  }
}

function setCache(data: Recall[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEntry))
  } catch {
    /* quota / private mode */
  }
}

export function clearFsisCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function tagContent(block: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m) return ''
  return stripHtml(m[1])
}

function normalizeClassification(raw?: string): RecallClassification {
  if (!raw || typeof raw !== 'string') return 'Unknown'
  const trimmed = raw.trim()
  // "Class I Recall" / "Class I" / "I"
  const classMatch = trimmed.match(/\bClass\s*(I{1,3})\b/i) || trimmed.match(/\b(I{1,3})\b/)
  if (classMatch) {
    const roman = classMatch[1].toUpperCase()
    const mapped = `Class ${roman}`
    if (KNOWN_CLASSIFICATIONS.has(mapped)) return mapped as RecallClassification
  }
  if (KNOWN_CLASSIFICATIONS.has(trimmed)) return trimmed as RecallClassification
  return 'Unknown'
}

/** Convert RSS/HTTP dates to YYYYMMDD used across the app. */
export function toRecallDate(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 8 && /^\d{8}/.test(digits) && parseInt(digits.slice(0, 4), 10) > 1990) {
    return digits.slice(0, 8)
  }
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear()
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const d = String(parsed.getUTCDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  return ''
}

function extractField(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:\\u2013-]\\s*([^\\n]+)`,
      'i'
    )
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function extractRecallNumber(text: string, link: string): string {
  const fromText =
    text.match(/\bRecall\s*(?:Number|No\.?|#)\s*[:-]?\s*(\d{1,4}-\d{4}(?:-Exp)?)\b/i) ||
    text.match(/\b(\d{1,4}-\d{4}(?:-Exp)?)\b/)
  if (fromText) return fromText[1]
  const fromLink = link.match(/(\d{1,4}-\d{4}(?:-exp)?)/i)
  if (fromLink) return fromLink[1]
  return ''
}

function extractEstablishmentNumber(text: string): string {
  const m =
    text.match(/\bEst(?:ablishment)?\.?\s*(?:No\.?|Number|#)?\s*[:-]?\s*([MPG]-?\d+[A-Z0-9-]*)\b/i) ||
    text.match(/\b([MPG]-\d+[A-Z0-9-]*)\b/) ||
    text.match(/\bestablishment\s+([MPG]?\d+[A-Z0-9-]*)\b/i)
  return m ? m[1].toUpperCase() : ''
}

function stableFsisId(recallNumber: string, link: string, title: string): string {
  if (recallNumber) return `USDA-${recallNumber}`
  if (link) {
    let hash = 0
    for (let i = 0; i < link.length; i++) {
      hash = ((hash << 5) - hash) + link.charCodeAt(i)
      hash |= 0
    }
    return `USDA-link-${Math.abs(hash).toString(36)}`
  }
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i)
    hash |= 0
  }
  return `USDA-gen-${Math.abs(hash).toString(36)}`
}

/**
 * Map one RSS <item> block to a Recall. Exported for unit tests.
 */
export function mapFsisItem(itemXml: string): Recall | null {
  if (!itemXml || typeof itemXml !== 'string') return null
  const title = tagContent(itemXml, 'title')
  const link = tagContent(itemXml, 'link') || tagContent(itemXml, 'guid')
  const description = tagContent(itemXml, 'description')
  const pubDate = tagContent(itemXml, 'pubDate')
  if (!title && !description && !link) return null

  const body = [title, description].filter(Boolean).join('\n')
  const recallNumber = extractRecallNumber(body + '\n' + link, link)
  const classificationRaw =
    extractField(body, ['Recall Class', 'Class', 'Classification']) ||
    (body.match(/\bClass\s+I{1,3}\b/i)?.[0] ?? '')
  const product =
    extractField(body, ['Product', 'Product Name', 'Products', 'Product(s)']) ||
    title
  const brand = extractField(body, ['Brand', 'Brand Name', 'Brand(s)'])
  const hazard =
    extractField(body, ['Hazard', 'Problem', 'Reason', 'Reason for Recall']) ||
    extractField(body, ['Pathogen'])
  const reason =
    hazard ||
    (description
      ? description.split('\n').map(s => s.trim()).filter(Boolean)[0] || title
      : title)
  const distribution =
    extractField(body, [
      'Distribution',
      'Distribution Area',
      'Distribution Pattern',
      'States',
      'Areas Distributed',
    ]) || 'See FSIS notice'
  const company =
    extractField(body, ['Company', 'Firm', 'Recalling Firm', 'Establishment']) ||
    (title.match(/^(.+?)\s+Recalls\b/i)?.[1] ?? '')
  const quantity = extractField(body, ['Quantity', 'Amount', 'Pounds', 'Volume'])
  const establishmentNumber = extractEstablishmentNumber(body)
  const cityState = extractField(body, ['Location', 'City'])
  let city = ''
  let state = ''
  if (cityState) {
    const cs = cityState.match(/^([^,]+),\s*([A-Z]{2})\b/)
    if (cs) {
      city = cs[1].trim()
      state = cs[2]
    } else {
      city = cityState
    }
  }
  // Fallback: "a City, ST establishment"
  if (!city) {
    const estLoc = body.match(/\ba\s+([^,]+),\s*([A-Z]{2})\s+establishment\b/i)
    if (estLoc) {
      city = estLoc[1].trim()
      state = estLoc[2].toUpperCase()
    }
  }

  const id = stableFsisId(recallNumber, link, title)
  return {
    id,
    source: 'USDA',
    recallNumber: recallNumber || id.replace(/^USDA-/, ''),
    eventId: '',
    productDescription: product || title || 'USDA FSIS recall',
    reasonForRecall: reason || 'See FSIS notice',
    classification: normalizeClassification(classificationRaw || body),
    status: 'Ongoing',
    distributionPattern: distribution,
    recallingFirm: company || 'See FSIS notice',
    city,
    state,
    country: 'United States',
    recallInitiationDate: toRecallDate(pubDate),
    productType: 'Meat/Poultry/Egg',
    codeInfo: establishmentNumber ? `Est. ${establishmentNumber}` : '',
    moreCodeInfo: '',
    voluntaryMandated: 'FSIS notification',
    rawClassification: classificationRaw || undefined,
    address1: '',
    address2: '',
    postalCode: '',
    centerClassificationDate: '',
    initialFirmNotification: 'FSIS press release',
    productQuantity: quantity,
    terminationDate: '',
    brand: brand || undefined,
    establishmentNumber: establishmentNumber || undefined,
    hazard: hazard || undefined,
    detailUrl: link || undefined,
    headline: title || undefined,
  }
}

/**
 * Parse FSIS recall RSS/XML into Recall records.
 */
export function parseFsisRss(xml: string): Recall[] {
  if (!xml || typeof xml !== 'string') return []
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
  const recalls: Recall[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const mapped = mapFsisItem(item)
    if (!mapped) continue
    if (seen.has(mapped.id)) continue
    seen.add(mapped.id)
    recalls.push(mapped)
  }
  return recalls
}

/** Accept either raw RSS XML string or pre-parsed JSON `{ recalls: Recall[] }`. */
export function parseFsisPayload(payload: string | unknown): Recall[] {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return parseFsisPayload(JSON.parse(trimmed))
      } catch {
        return parseFsisRss(trimmed)
      }
    }
    return parseFsisRss(trimmed)
  }
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as { recalls?: unknown; results?: unknown }
  const list = Array.isArray(obj.recalls)
    ? obj.recalls
    : Array.isArray(obj.results)
      ? obj.results
      : Array.isArray(payload)
        ? payload
        : []
  return (list as Recall[])
    .filter(r => r && typeof r === 'object')
    .map(r => ({
      ...r,
      source: 'USDA' as const,
      id: r.id || (r.recallNumber ? `USDA-${r.recallNumber}` : `USDA-gen-${Math.random().toString(36).slice(2)}`),
    }))
}

export function filterFsisRecalls(
  recalls: Recall[],
  params?: {
    search?: string
    classification?: string
    status?: string
    state?: string
    dietary?: string[]
    /** Optional distribution matcher (injected to avoid circular imports with api.ts). */
    matchesDistribution?: (distributionPattern: string, selectedState: string) => boolean
  }
): Recall[] {
  const search = (params?.search || '').trim().toLowerCase()
  const classification = params?.classification || ''
  const status = params?.status || ''
  const state = params?.state || ''
  const dietary = params?.dietary || []
  const matchesDistribution = params?.matchesDistribution

  return recalls.filter(r => {
    if (search) {
      const hay = `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm} ${r.brand || ''} ${r.headline || ''} ${r.hazard || ''}`.toLowerCase()
      if (!hay.includes(search)) return false
    }
    if (classification && r.classification !== classification) return false
    if (status && r.status.toLowerCase() !== status.toLowerCase()) return false
    if (state && matchesDistribution && !matchesDistribution(r.distributionPattern, state)) return false
    if (dietary.length > 0 && !matchesDietaryConcerns(r, dietary as DietaryConcern[])) return false
    return true
  })
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

function staticUrl(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}${FSIS_STATIC_PATH}`
}

/**
 * Fetch USDA FSIS recalls.
 *
 * Resolution order (hybrid architecture):
 * 1. Same-origin serverless/JSON proxy `/api/fsis/recalls` (dev middleware or future edge fn)
 * 2. Vite-proxied raw RSS `/api/fsis-rss/...` (dev only)
 * 3. Build-time static JSON under `data/fsis-recalls.json` (GitHub Pages)
 * 4. In-memory mock FSIS fixtures (demo / total outage)
 */
export async function fetchFsisRecalls(params?: {
  signal?: AbortSignal
  demo?: boolean
}): Promise<FsisFetchResult> {
  if (params?.demo) {
    return { recalls: mockFsisRecalls, error: null, isStale: false, fromStatic: true }
  }

  const cached = getCache()
  if (params?.signal?.aborted) {
    return {
      recalls: cached?.data ?? [],
      error: { code: 'NETWORK', message: 'Aborted', retryable: false },
      isStale: Boolean(cached),
      fromStatic: false,
    }
  }

  const isBrowser = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
  const candidates: string[] = []
  if (isBrowser) {
    candidates.push(`${window.location.origin}${FSIS_API_PATH}`)
    candidates.push(`${window.location.origin}/api/fsis-rss${FSIS_RSS_PATH}`)
  }
  candidates.push(staticUrl())

  let lastError: FsisFetchResult['error'] = null

  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, params?.signal)
      if (!res.ok) {
        if (res.status === 404) continue
        lastError = {
          code: res.status === 429 ? 'RATE_LIMIT' : 'SERVER',
          message: `FSIS fetch failed (${res.status})`,
          retryable: res.status >= 500 || res.status === 429,
        }
        continue
      }
      const contentType = res.headers.get('content-type') || ''
      let recalls: Recall[] = []
      if (contentType.includes('json') || url.includes(FSIS_STATIC_PATH) || url.includes(FSIS_API_PATH)) {
        const json = await res.json()
        recalls = parseFsisPayload(json)
      } else {
        const text = await res.text()
        recalls = parseFsisPayload(text)
      }
      if (recalls.length === 0 && !url.includes(FSIS_STATIC_PATH)) {
        // empty live feed is valid; still cache
      }
      setCache(recalls)
      return {
        recalls,
        error: null,
        isStale: false,
        fromStatic: url.includes(FSIS_STATIC_PATH),
      }
    } catch (e: unknown) {
      const isAbort = e instanceof DOMException && e.name === 'AbortError'
      lastError = {
        code: isAbort ? 'TIMEOUT' : 'NETWORK',
        message: e instanceof Error ? e.message : 'Network error',
        retryable: true,
      }
      if (isAbort) break
    }
  }

  if (cached) {
    return {
      recalls: cached.data,
      error: lastError ?? { code: 'NETWORK', message: 'Using cached FSIS data', retryable: true },
      isStale: true,
      fromStatic: false,
    }
  }

  // Soft-fail: empty USDA set should not block FDA results
  return {
    recalls: [],
    error: lastError ?? { code: 'NETWORK', message: 'FSIS unavailable', retryable: true },
    isStale: false,
    fromStatic: false,
  }
}

export function sortRecallsByDateDesc(recalls: Recall[]): Recall[] {
  return [...recalls].sort((a, b) => {
    const da = a.recallInitiationDate || ''
    const db = b.recallInitiationDate || ''
    if (da !== db) return db.localeCompare(da)
    // Stable tie-break: USDA then FDA, then id
    if (a.source !== b.source) return a.source === 'USDA' ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}

/** Merge FDA page results with filtered FSIS recalls (FSIS included on every view when matching filters). */
export function mergeRecallFeeds(fda: Recall[], fsis: Recall[], options?: { includeFsis?: boolean }): Recall[] {
  const includeFsis = options?.includeFsis !== false
  const fsisTagged = includeFsis ? fsis.map(r => ({ ...r, source: 'USDA' as const })) : []
  const fdaTagged = fda.map(r => ({ ...r, source: r.source || ('FDA' as const) }))
  const seen = new Set<string>()
  const merged: Recall[] = []
  for (const r of sortRecallsByDateDesc([...fsisTagged, ...fdaTagged])) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    merged.push(r)
  }
  return merged
}

export { FSIS_RSS_URL, FSIS_RSS_PATH }
