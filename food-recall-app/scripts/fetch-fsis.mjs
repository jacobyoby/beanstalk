#!/usr/bin/env node
/**
 * Build-time USDA FSIS recall fetch.
 *
 * Architecture (hybrid):
 * - Dev: Vite proxies raw FSIS RSS at /api/fsis-rss (CORS bypass).
 * - Prod (static / GitHub Pages): this script bakes public/data/fsis-recalls.json.
 * - Optional future: same-origin /api/fsis/recalls serverless function returning JSON.
 *
 * FSIS has no public REST API and blocks browser CORS; RSS/CSV only.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'public', 'data', 'fsis-recalls.json')
const RSS_URL =
  process.env.FSIS_RSS_URL ||
  'https://www.fsis.usda.gov/rss/food-recall-notification-and-destruction-orders-rss-feed.xml'

function stripHtml(html) {
  return String(html || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
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
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function tagContent(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  return m ? stripHtml(m[1]) : ''
}

function toRecallDate(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
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

function extractField(text, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-–]\\s*([^\\n]+)`, 'i')
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function normalizeClassification(raw, body) {
  const src = `${raw || ''} ${body || ''}`
  const m = src.match(/\bClass\s*(I{1,3})\b/i)
  if (m) return `Class ${m[1].toUpperCase()}`
  return 'Unknown'
}

function mapItem(itemXml) {
  const title = tagContent(itemXml, 'title')
  const link = tagContent(itemXml, 'link') || tagContent(itemXml, 'guid')
  const description = tagContent(itemXml, 'description')
  const pubDate = tagContent(itemXml, 'pubDate')
  if (!title && !description && !link) return null
  const body = [title, description].filter(Boolean).join('\n')
  const recallNumber =
    (body.match(/\bRecall\s*(?:Number|No\.?|#)\s*[:\-]?\s*(\d{1,4}-\d{4}(?:-Exp)?)\b/i) ||
      body.match(/\b(\d{1,4}-\d{4}(?:-Exp)?)\b/) ||
      link.match(/(\d{1,4}-\d{4}(?:-exp)?)/i) ||
      [])[1] || ''
  const classificationRaw =
    extractField(body, ['Recall Class', 'Class', 'Classification']) ||
    (body.match(/\bClass\s+I{1,3}\b/i)?.[0] ?? '')
  const product =
    extractField(body, ['Product', 'Product Name', 'Products', 'Product(s)']) || title
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
  const estMatch =
    body.match(/\bEst(?:ablishment)?\.?\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([MPG]-?\d+[A-Z0-9\-]*)\b/i) ||
    body.match(/\b([MPG]-\d+[A-Z0-9\-]*)\b/)
  const establishmentNumber = estMatch ? estMatch[1].toUpperCase() : ''
  let city = ''
  let state = ''
  const estLoc = body.match(/\ba\s+([^,]+),\s*([A-Z]{2})\s+establishment\b/i)
  if (estLoc) {
    city = estLoc[1].trim()
    state = estLoc[2].toUpperCase()
  }
  const id = recallNumber
    ? `USDA-${recallNumber}`
    : `USDA-link-${Math.abs(
        Array.from(link || title).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      ).toString(36)}`
  return {
    id,
    source: 'USDA',
    recallNumber: recallNumber || id.replace(/^USDA-/, ''),
    eventId: '',
    productDescription: product || title || 'USDA FSIS recall',
    reasonForRecall: reason || 'See FSIS notice',
    classification: normalizeClassification(classificationRaw, body),
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

function parseRss(xml) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
  const recalls = []
  const seen = new Set()
  for (const item of items) {
    const mapped = mapItem(item)
    if (!mapped || seen.has(mapped.id)) continue
    seen.add(mapped.id)
    recalls.push(mapped)
  }
  return recalls
}

function writePayload(recalls, meta = {}) {
  mkdirSync(dirname(OUT), { recursive: true })
  const payload = {
    source: 'USDA FSIS',
    generatedAt: new Date().toISOString(),
    ...meta,
    recalls,
  }
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')
  console.log(`[fetch-fsis] wrote ${recalls.length} recalls → ${OUT}`)
}

async function main() {
  try {
    const res = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'BeanstalkFoodRecallBot/0.1 (+https://github.com/jacobyoby/beanstalk)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const recalls = parseRss(xml)
    if (recalls.length === 0) throw new Error('Parsed 0 items from FSIS RSS')
    writePayload(recalls, { feed: RSS_URL, mode: 'live-rss' })
  } catch (err) {
    console.warn(`[fetch-fsis] live fetch failed: ${err instanceof Error ? err.message : err}`)
    if (existsSync(OUT)) {
      try {
        const existing = JSON.parse(readFileSync(OUT, 'utf8'))
        if (Array.isArray(existing.recalls) && existing.recalls.length > 0) {
          console.warn(`[fetch-fsis] keeping existing ${existing.recalls.length} recalls`)
          return
        }
      } catch {
        /* fall through */
      }
    }
    // Minimal seed so production always has USDA coverage
    writePayload(
      [
        {
          id: 'USDA-SEED-001',
          source: 'USDA',
          recallNumber: 'SEED-001',
          eventId: '',
          productDescription: 'USDA FSIS feed unavailable at build time — seed placeholder',
          reasonForRecall: 'Build-time FSIS RSS unreachable; replace on next successful fetch',
          classification: 'Unknown',
          status: 'Ongoing',
          distributionPattern: 'Nationwide',
          recallingFirm: 'FSIS seed',
          city: '',
          state: '',
          country: 'United States',
          recallInitiationDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
          productType: 'Meat/Poultry/Egg',
          codeInfo: '',
          moreCodeInfo: '',
          voluntaryMandated: 'FSIS notification',
          address1: '',
          address2: '',
          postalCode: '',
          centerClassificationDate: '',
          initialFirmNotification: 'FSIS press release',
          productQuantity: '',
          terminationDate: '',
          detailUrl: 'https://www.fsis.usda.gov/recalls',
          headline: 'FSIS seed placeholder',
        },
      ],
      { mode: 'seed-fallback', error: String(err) }
    )
  }
}

main()
