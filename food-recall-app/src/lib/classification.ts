import type { RecallClassification } from "../types/recall";

export type RiskLabel = "High risk" | "Moderate risk" | "Low risk" | "Not yet classified" | "Unclassified";

export interface RiskLevel {
  label: RiskLabel;
  /** FDA definition from 21 CFR 7.3, shown verbatim so the label never overstates the record. */
  definition: string;
  /** True when the FDA record carries one of the three defined classes. */
  classified: boolean;
}

const RISK_LEVELS: Record<RecallClassification, RiskLevel> = {
  "Class I": {
    label: "High risk",
    definition:
      "Class I: reasonable probability that use of or exposure to the product will cause serious adverse health consequences or death (21 CFR 7.3).",
    classified: true,
  },
  "Class II": {
    label: "Moderate risk",
    definition:
      "Class II: use of or exposure to the product may cause temporary or medically reversible adverse health consequences, or the probability of serious consequences is remote (21 CFR 7.3).",
    classified: true,
  },
  "Class III": {
    label: "Low risk",
    definition:
      "Class III: use of or exposure to the product is not likely to cause adverse health consequences (21 CFR 7.3).",
    classified: true,
  },
  "Not Yet Classified": {
    label: "Not yet classified",
    definition: "FDA has not yet assigned a hazard class to this record.",
    classified: false,
  },
  Unknown: {
    label: "Unclassified",
    definition: "The FDA record carried no recognized classification value.",
    classified: false,
  },
};

export function riskLevel(classification: RecallClassification): RiskLevel {
  return RISK_LEVELS[classification];
}
