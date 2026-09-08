export type RecallClassification = 'Class I' | 'Class II' | 'Class III'
export interface Recall {
  id: string
  recallNumber: string
  eventId: string
  productDescription: string
  reasonForRecall: string
  classification: RecallClassification
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
}
export interface OpenFDAResponse { meta: { results: { total: number; skip: number; limit: number } }; results: any[] }
