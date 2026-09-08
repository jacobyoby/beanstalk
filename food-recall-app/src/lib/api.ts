import type { Recall } from '../types/recall'
import { mockRecalls } from './mockData'
function mapOpenFDA(r: any): Recall {
  return {
    id: r.recall_number || r.event_id || Math.random().toString(36).slice(2),
    recallNumber: r.recall_number || '',
    eventId: r.event_id || '',
    productDescription: r.product_description || '',
    reasonForRecall: r.reason_for_recall || '',
    classification: (r.classification as any) || 'Class II',
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
export async function fetchRecalls(params?: { search?: string; limit?: number; skip?: number }): Promise<{ recalls: Recall[]; total: number; fromMock: boolean }> {
  const limit = params?.limit ?? 20
  const skip = params?.skip ?? 0
  const search = params?.search?.trim()
  // Try openFDA
  try {
    let url = `https://api.fda.gov/food/enforcement.json?limit=${limit}&skip=${skip}`
    if (search) url += `&search=product_description:"${encodeURIComponent(search)}"+OR+reason_for_recall:"${encodeURIComponent(search)}"+OR+recalling_firm:"${encodeURIComponent(search)}"`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`FDA ${res.status}`)
    const data = await res.json()
    const recalls: Recall[] = (data.results || []).map(mapOpenFDA)
    return { recalls, total: data.meta?.results?.total ?? recalls.length, fromMock: false }
  } catch {
    // fallback to mock with client-side search
    let filtered = mockRecalls
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(r => `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`.toLowerCase().includes(q))
    }
    const total = filtered.length
    const paged = filtered.slice(skip, skip + limit)
    return { recalls: paged, total, fromMock: true }
  }
}
