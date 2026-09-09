import { STATE_NAMES } from "./usStates";

export interface DistributionScope {
  /** "Nationwide", "3 states", or "Unclear". */
  label: string;
  /** Distinct state abbreviations found in the FDA text, in the order they appear. */
  states: string[];
}

const NATIONWIDE = /nationwide|national distribution|\bnational\b/i;

/**
 * Bounded read of FDA distribution_pattern for an at-a-glance scope. Abbreviations match
 * case-sensitively on word boundaries (so "in" never becomes Indiana); full names match
 * case-insensitively. Text with no recognizable state or nationwide term is "Unclear".
 */
export function distributionScope(distributionPattern: string): DistributionScope {
  const text = distributionPattern.trim();
  if (!text) return { label: "Unclear", states: [] };
  const found: Array<{ abbr: string; index: number }> = [];
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    const abbrMatch = new RegExp(`\\b${abbr}\\b`).exec(text);
    const nameMatch = new RegExp(`\\b${name}\\b`, "i").exec(text);
    const index = Math.min(
      abbrMatch ? abbrMatch.index : Number.POSITIVE_INFINITY,
      nameMatch ? nameMatch.index : Number.POSITIVE_INFINITY,
    );
    if (index !== Number.POSITIVE_INFINITY) found.push({ abbr, index });
  }
  const states = found.sort((a, b) => a.index - b.index).map((s) => s.abbr);
  if (NATIONWIDE.test(text)) return { label: "Nationwide", states };
  if (states.length === 0) return { label: "Unclear", states };
  return { label: `${states.length} ${states.length === 1 ? "state" : "states"}`, states };
}
