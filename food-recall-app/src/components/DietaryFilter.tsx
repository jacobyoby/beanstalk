import { DIETARY_LABELS, type DietaryConcern } from "../lib/dietary";

const ALLERGENS: DietaryConcern[] = [
  "milk",
  "eggs",
  "fish",
  "crustacean",
  "tree_nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
];
const BROADER: DietaryConcern[] = ["gluten", "vegan", "vegetarian", "halal", "kosher"];

interface Props {
  selected: DietaryConcern[];
  onChange: (next: DietaryConcern[]) => void;
}

interface GroupProps {
  legend: string;
  concerns: DietaryConcern[];
  selected: DietaryConcern[];
  onToggle: (c: DietaryConcern) => void;
}

function ConcernGroup({ legend, concerns, selected, onToggle }: GroupProps) {
  return (
    <fieldset>
      <legend className="label mb-1">{legend}</legend>
      <div className="grid grid-cols-2 gap-x-2">
        {concerns.map((c) => (
          <label
            key={c}
            className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
          >
            <input
              type="checkbox"
              checked={selected.includes(c)}
              onChange={() => onToggle(c)}
              className="h-4 w-4 rounded border-zinc-300 accent-emerald-700 focus:ring-2 focus:ring-emerald-600 dark:border-zinc-600"
            />
            {DIETARY_LABELS[c]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function DietaryFilter({ selected, onChange }: Props) {
  const toggle = (c: DietaryConcern) => {
    if (selected.includes(c)) onChange(selected.filter((x) => x !== c));
    else onChange([...selected, c]);
  };
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Dietary concerns</h2>
      <ConcernGroup legend="FDA major allergens (9)" concerns={ALLERGENS} selected={selected} onToggle={toggle} />
      <ConcernGroup legend="Broader (text matches)" concerns={BROADER} selected={selected} onToggle={toggle} />
      {selected.length > 0 && (
        <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">
          Filtering by {selected.map((s) => DIETARY_LABELS[s]).join(", ")} — {selected.length} concern(s)
        </p>
      )}
      <details className="hint">
        <summary className="cursor-pointer select-none">How dietary matching works</summary>
        <p className="mt-1">
          Matches recall reason or product description (source-stated). Absence of a term does not mean allergen-free.
          Wheat allergy is distinct from gluten.
        </p>
        <p>
          Vegan/vegetarian/halal/kosher are source-stated claims; gluten includes wheat/barley/rye/malt. Not certified.
        </p>
      </details>
    </div>
  );
}
