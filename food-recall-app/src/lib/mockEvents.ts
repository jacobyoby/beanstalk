import type { AdverseEvent } from '../types/event'

export const mockEvents: AdverseEvent[] = [
  {
    id: 'AE-DEMO-1001',
    reportNumber: 'DEMO-1001',
    dateStarted: '20260301',
    dateCreated: '20260305',
    outcomes: ['Medically Important', 'Other Outcome'],
    reactions: ['DIARRHOEA', 'VOMITING', 'NAUSEA'],
    products: [
      { nameBrand: 'DEMO Jalapeño Peppers', industryCode: '23', industryName: 'Vegetables/Vegetable Products', role: 'SUSPECT' },
    ],
    consumer: { age: '42', ageUnit: 'year(s)', gender: 'Female' },
  },
  {
    id: 'AE-DEMO-1002',
    reportNumber: 'DEMO-1002',
    dateStarted: '20260215',
    dateCreated: '20260220',
    outcomes: ['Hospitalization', 'Life Threatening'],
    reactions: ['SALMONELLA INFECTION', 'FEVER', 'ABDOMINAL PAIN'],
    products: [
      { nameBrand: 'DEMO Powdered Whole Milk', industryCode: '09', industryName: 'Milk/Butter/Dried Milk Products', role: 'SUSPECT' },
    ],
    consumer: { age: '68', ageUnit: 'year(s)', gender: 'Male' },
  },
  {
    id: 'AE-DEMO-1003',
    reportNumber: 'DEMO-1003',
    dateStarted: '20260120',
    dateCreated: '20260125',
    outcomes: ['Other Outcome'],
    reactions: ['ALLERGIC REACTION', 'URTICARIA', 'DYSPNOEA'],
    products: [
      { nameBrand: 'DEMO Dark Chocolate Bar', industryCode: '34', industryName: 'Bakery Prod/Dough/Mix/Icing', role: 'SUSPECT' },
      { nameBrand: 'DEMO Sea Salt Snack', industryCode: '07', industryName: 'Snack Food Item', role: 'CONCOMITANT' },
    ],
    consumer: { age: '15', ageUnit: 'year(s)', gender: 'Female' },
  },
  {
    id: 'AE-DEMO-1004',
    reportNumber: 'DEMO-1004',
    dateStarted: '20260310',
    dateCreated: '20260312',
    outcomes: ['Medically Important'],
    reactions: ['LISTERIA INFECTION', 'CHILLS'],
    products: [
      { nameBrand: 'DEMO Prepared Pasta Meals', industryCode: '37', industryName: 'Multiple Food Dinner/Grav/Sauce/Special', role: 'SUSPECT' },
    ],
    consumer: { age: '55', ageUnit: 'year(s)', gender: 'Male' },
  },
  {
    id: 'AE-DEMO-1005',
    reportNumber: 'DEMO-1005',
    dateStarted: '20260201',
    dateCreated: '20260208',
    outcomes: ['Other Outcome'],
    reactions: ['ANAPHYLACTIC REACTION'],
    products: [
      { nameBrand: 'DEMO Aquafaba Powder', industryCode: '24', industryName: 'Vegetables/Vegetable Products', role: 'SUSPECT' },
    ],
    consumer: { age: '29', ageUnit: 'year(s)', gender: 'Female' },
  },
  {
    id: 'AE-DEMO-1006',
    reportNumber: 'DEMO-1006',
    dateStarted: '20260118',
    dateCreated: '20260122',
    outcomes: ['Hospitalization'],
    reactions: ['SALMONELLA INFECTION', 'DEHYDRATION'],
    products: [
      { nameBrand: 'DEMO Moringa Leaf Powder', industryCode: '25', industryName: 'Vegetables/Vegetable Products', role: 'SUSPECT' },
    ],
    consumer: { age: '34', ageUnit: 'year(s)', gender: 'Male' },
  },
]