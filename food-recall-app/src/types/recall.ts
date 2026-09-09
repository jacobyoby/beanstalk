export type RecallClassification = 'Class I' | 'Class II' | 'Class III' | 'Not Yet Classified' | 'Unknown'
export type RecallSource = 'FDA' | 'USDA'

export interface Recall {
  id: string
  /** Data source jurisdiction: FDA (openFDA) or USDA FSIS (meat/poultry/egg). */
  source: RecallSource
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
  /** USDA FSIS: brand name when present in the notice. */
  brand?: string
  /** USDA FSIS: establishment number (e.g. M-12345, P-678). */
  establishmentNumber?: string
  /** USDA FSIS: primary hazard / problem statement when distinct from reason. */
  hazard?: string
  /** Canonical public detail URL (FSIS notice or FDA iRES deep link). */
  detailUrl?: string
  /** Original headline from USDA RSS when different from product description. */
  headline?: string
}
export interface OpenFDAResponse { meta: { results: { total: number; skip: number; limit: number } }; results: any[] }
