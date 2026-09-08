export type RecallClassification = 'Class I' | 'Class II' | 'Class III' | 'Not Yet Classified' | 'Unknown'
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
  rawClassification?: string
  rawStatus?: string
  address1: string
  address2: string
  postalCode: string
  centerClassificationDate: string
  initialFirmNotification: string
  productQuantity: string
  terminationDate: string
}
export interface OpenFDAResponse { meta: { results: { total: number; skip: number; limit: number } }; results: any[] }
