/**
 * Build-time script: fetches the USDA FSIS recall RSS feed,
 * parses it, normalizes to the app's Recall shape, and writes
 * public/fsis-recalls.json as static JSON.
 *
 * Run: tsx scripts/fetch-fsis-recalls.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FSIS_RSS_URL =
  'https://www.fsis.usda.gov/rss/food-recall-notification-and-destruction-orders-rss-feed.xml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = resolve(__dirname, '..', 'public', 'fsis-recalls.json')

// ---------- Minimal XML helpers (no deps) ----------

/** Extract all <item> blocks from RSS XML. */
function extractItems(xml: string): string[] {
  const items: string[] = []
  const re = /<item[\s>]([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    items.push(m[1])
  }
  return items
}

/** Extract text content of a tag, decoding CDATA and basic entities. */
function tag(xml: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')
  const m = re.exec(xml)
  if (!m) return ''
  let val = m[1].trim()
  // Unwrap CDATA
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/i.exec(val)
  if (cdata) val = cdata[1]
  return decodeEntities(val)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

/** Strip HTML tags and collapse whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}

// ---------- FSIS field extraction from description ----------

/** Try to pull "Establishment Number" from the description text. */
function extractEstablishment(text: string): string {
  const m = /establishment\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9+]+)/i.exec(text)
  return m ? m[1] : ''
}

/** Extract recall class (I, II, III) from the text. */
function extractRecallClass(text: string): string {
  // "Class I" / "Class II" / "Class III"
  const m = /\bclass\s+(I{1,3})\b/i.exec(text)
  if (m) return m[1].toUpperCase()
  return ''
}

/** Map recall class to the app's RecallClassification. */
function mapClassification(cls: string): string {
  if (cls === 'I') return 'Class I'
  if (cls === 'II') return 'Class II'
  if (cls === 'III') return 'Class III'
  return 'Unknown'
}

/** Extract the company / firm name. FSIS titles often follow
 *  "Company Name Recalls Product" pattern. Also try description. */
function extractCompany(title: string, text: string): string {
  // Try "X recalls" / "X announces" pattern in title
  const titleMatch = /^(.+?)\s+(?:recalls?|announces?|issues)\b/i.exec(title)
  if (titleMatch) return titleMatch[1].trim()
  // Try from description first sentence
  const firstSentence = text.split(/[.\n]/)[0] || ''
  const descMatch = /^(.+?)\s+(?:is recalling|recalls?|announced|has recalled)\b/i.exec(firstSentence)
  if (descMatch) return descMatch[1].trim()
  return ''
}

/** Extract brand from description (e.g., "brand name ABC"). */
function extractBrand(text: string, title: string): string {
  // FSIS descriptions often mention brand near the start
  const brandMatch = /(?:brand|brands|branded)\s*:?\s*["']?([^"',\n]+)/i.exec(text)
  if (brandMatch) return brandMatch[1].trim()
  // Fall back to the first proper noun in the title (before "recalls")
  const titleMatch = /^(.+?)\s+(?:recalls?|announces?|issues)\b/i.exec(title)
  return titleMatch ? titleMatch[1].trim() : ''
}

/** Extract hazard / reason from description. */
function extractHazard(text: string): string {
  // Look for common hazard keywords with context
  const patterns = [
    /(?:because|due to|for)\s+(?:the\s+)?(?:product\s+)?(?:may\s+)?(?:be\s+)?(?:contaminated\s+with|contain|have|present)\s+([^.]+)/i,
    /(?:potential(?:ly)?|possible|undeclared)\s+([^.,]+)/i,
    /(?:listeria|salmonella|e\.?\s*coli|allergen|undeclared|foreign\s+matter|misbranded)/i,
  ]
  for (const p of patterns) {
    const m = p.exec(text)
    if (m) return (m[1] || m[0]).trim().slice(0, 200)
  }
  // Fallback: first sentence
  return (text.split(/[.\n]/)[0] || '').trim().slice(0, 200)
}

/** Extract distribution area. */
function extractDistribution(text: string): string {
  const m = /(?:distributed|distributed to|shipped to|nationwide distribution|distribution)\s*(?:in|to|throughout)?\s*:?([^.\n]+)/i.exec(text)
  if (m) return m[1].trim()
  if (/nationwide/i.test(text)) return 'Nationwide'
  return ''
}

/** Extract quantity. */
function extractQuantity(text: string): string {
  const m = /(\d[\d,]*\s*(?:pounds?|lbs?|kg|units?|cases?|packages?|boxes?|bags?|containers?|jars?|cans?|pouches?|pieces?|cartons?))/i.exec(text)
  return m ? m[1].trim() : ''
}

/** Parse RSS pubDate to ISO date string. */
function parseDate(pubDate: string): string {
  if (!pubDate) return ''
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/** Generate a stable ID from the FSIS link or title. */
function stableId(link: string, title: string): string {
  // Try to extract case number from URL: /recall/NNNNN
  const caseMatch = /\/recall\/(\d+)/i.exec(link)
  if (caseMatch) return `FSIS-${caseMatch[1]}`
  // Try from title: "NN-NNNNN"
  const numMatch = /\b(\d{2}-\d{4,5})\b/.exec(title)
  if (numMatch) return `FSIS-${numMatch[1]}`
  // Fallback hash
  const key = `${link}|${title}`
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return `FSIS-${Math.abs(hash).toString(36)}`
}

// ---------- Main ----------

interface FsisRecall {
  id: string
  source: 'USDA-FSIS'
  recallNumber: string
  eventId: string
  productDescription: string
  reasonForRecall: string
  classification: string
  status: string
  distributionPattern: string
  recallingFirm: string
  city: string
  state: string
  country: string
  recallInitiationDate: string
  productType: string
  codeInfo: string
  moreCodeInfo: string
  voluntaryMandated: string
  address1: string
  address2: string
  postalCode: string
  centerClassificationDate: string
  initialFirmNotification: string
  productQuantity: string
  terminationDate: string
  establishmentNumber: string
  hazard: string
  link: string
}

function parseItem(item: string): FsisRecall | null {
  try {
    const title = tag(item, 'title')
    const link = tag(item, 'link')
    const description = tag(item, 'description')
    const pubDate = tag(item, 'pubDate')

    if (!title) return null

    const plainDesc = stripHtml(description)
    const recallClass = extractRecallClass(plainDesc) || extractRecallClass(title)
    const company = extractCompany(title, plainDesc)
    const brand = extractBrand(plainDesc, title)

    const id = stableId(link, title)
    return {
      id,
      source: 'USDA-FSIS',
      recallNumber: id,
      eventId: '',
      productDescription: title,
      reasonForRecall: extractHazard(plainDesc),
      classification: mapClassification(recallClass),
      status: 'Ongoing',
      distributionPattern: extractDistribution(plainDesc),
      recallingFirm: company || brand,
      city: '',
      state: '',
      country: 'USA',
      recallInitiationDate: parseDate(pubDate),
      productType: 'Meat/Poultry/Egg',
      codeInfo: '',
      moreCodeInfo: plainDesc.slice(0, 500),
      voluntaryMandated: 'Voluntary',
      address1: '',
      address2: '',
      postalCode: '',
      centerClassificationDate: '',
      initialFirmNotification: 'Press Release',
      productQuantity: extractQuantity(plainDesc),
      terminationDate: '',
      establishmentNumber: extractEstablishment(plainDesc),
      hazard: extractHazard(plainDesc),
      link,
    }
  } catch {
    // Malformed entry — skip gracefully
    return null
  }
}

async function main() {
  console.log(`Fetching FSIS RSS from ${FSIS_RSS_URL}...`)
  const res = await fetch(FSIS_RSS_URL, {
    headers: { 'User-Agent': 'Beanstalk-FoodRecall/1.0 (build script)' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`FSIS RSS fetch failed: ${res.status} ${res.statusText}`)
  }
  const xml = await res.text()
  const items = extractItems(xml)
  console.log(`Parsed ${items.length} RSS items.`)

  const recalls: FsisRecall[] = []
  for (const item of items) {
    const parsed = parseItem(item)
    if (parsed) recalls.push(parsed)
  }

  // Deduplicate by id
  const seen = new Set<string>()
  const deduped: FsisRecall[] = []
  for (const r of recalls) {
    if (!seen.has(r.id)) {
      seen.add(r.id)
      deduped.push(r)
    }
  }

  console.log(`Normalized ${deduped.length} FSIS recalls (after dedup).`)

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, JSON.stringify(deduped, null, 2), 'utf-8')
  console.log(`Wrote ${OUT_PATH}`)
}

main().catch(err => {
  console.error('FSIS fetch failed:', err)
  process.exit(1)
})
