import type { ReasonCategory } from "../lib/reasonCategory";
import type { RecallClassification } from "../types/recall";

interface Props {
  classification: RecallClassification | "";
  hazard: ReasonCategory | "";
  onClassification: (v: RecallClassification | "") => void;
  onHazard: (v: ReasonCategory | "") => void;
}

interface ToggleProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
}

function Toggle({ label, pressed, onClick }: ToggleProps) {
  const tone = pressed
    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
    : "border-zinc-300 bg-paper text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-[40px] items-center rounded-full border px-3.5 text-sm font-medium transition focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${tone}`}
    >
      {label}
    </button>
  );
}

const HAZARD_CHIPS: Array<{ label: string; value: ReasonCategory }> = [
  { label: "Pathogen", value: "Pathogen" },
  { label: "Allergen", value: "Undeclared allergen" },
  { label: "Foreign material", value: "Foreign material" },
];

/**
 * One-tap filters for the most common questions, modeled on recall apps' bottom tabs.
 * "High risk" toggles the Class I filter; hazard chips are mutually exclusive and filter server-side.
 */
export default function QuickFilters({ classification, hazard, onClassification, onHazard }: Props) {
  const highRisk = classification === "Class I";
  const nothingSelected = !highRisk && hazard === "";
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">Quick filters</legend>
      <Toggle
        label="All"
        pressed={nothingSelected}
        onClick={() => {
          onClassification("");
          onHazard("");
        }}
      />
      <Toggle label="High risk" pressed={highRisk} onClick={() => onClassification(highRisk ? "" : "Class I")} />
      {HAZARD_CHIPS.map((chip) => (
        <Toggle
          key={chip.value}
          label={chip.label}
          pressed={hazard === chip.value}
          onClick={() => onHazard(hazard === chip.value ? "" : chip.value)}
        />
      ))}
    </fieldset>
  );
}
