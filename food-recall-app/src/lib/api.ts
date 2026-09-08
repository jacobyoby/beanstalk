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
    recallInitiationDate: r.recall_initiation_date || '',
    productType: r.product_type || 'Food',
    codeInfo: r.code_info || '',
    voluntaryMandated: r.voluntary_mandated || '',
  }
}

function sanitizeSearchQuery(query: string): string {
  return query.replace(/["\\]/g, '').trim()
}

export async function fetchRecalls(params?: {
  search?: string
  limit?: number
  skip?: number
}): Promise<{ recalls: Recall[]; total: number; fromMock: boolean }> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = sanitizeSearchQuery(params?.search || '')

  try {
    let url = `https://api.fda.gov/food/enforcement.json?limit=${limit}&skip=${skip}`
    if (search) {
      const fields = ['product_description', 'reason_for_recall', 'recalling_firm']
      const clause = fields.map(f => `${f}:"${search}"`).join('+OR+')
      url += `&search=${clause}`
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`FDA ${res.status}`)
    const data = await res.json()
    const recalls: Recall[] = (data.results || []).map(mapOpenFDA)
    return { recalls, total: data.meta?.results?.total ?? recalls.length, fromMock: false }
  } catch {
    let filtered = mockRecalls
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r =>
        `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`.toLowerCase().includes(q)
      )
    }
    const total = filtered.length
    const paged = filtered.slice(skip, skip + limit)
    return { recalls: paged, total, fromMock: true }
  }
}
