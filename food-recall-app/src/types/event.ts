export interface AdverseEventProduct {
  nameBrand: string;
  industryCode: string;
  industryName: string;
  role: string;
}

export interface AdverseEventConsumer {
  age: string;
  ageUnit: string;
  gender: string;
}

export interface AdverseEvent {
  id: string;
  reportNumber: string;
  dateStarted: string;
  dateCreated: string;
  outcomes: string[];
  reactions: string[];
  products: AdverseEventProduct[];
  consumer: AdverseEventConsumer;
}

export const FDA_EVENT_DISCLAIMER =
  "FDA CAERS data is not scientifically verified. These are unverified consumer/industry reports — not confirmed recalls or proven product defects.";
