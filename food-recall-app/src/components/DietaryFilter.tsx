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

export default function DietaryFilter({ selected, onChange }: Props) {
  const toggle = (c: DietaryConcern) => {
    if (selected.includes(c)) onChange(selected.filter((x) => x !== c));
    else onChange([...selected, c]);
  };
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm dark:text-zinc-100">Dietary concerns</h2>
      <p className="hint">
        Matches recall reason or product description (source-stated). Absence of a term does not mean allergen-free.
        Wheat allergy is distinct from gluten.
      </p>
      <div>
        <p className="text-xs font-medium dark:text-zinc-300">FDA major allergens (9)</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {ALLERGENS.map((c) => (
            <label key={c} className="flex items-center gap-1 text-xs dark:text-zinc-200">
              <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} className="rounded" />
              {DIETARY_LABELS[c]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium dark:text-zinc-300">Broader (text matches)</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {BROADER.map((c) => (
            <label key={c} className="flex items-center gap-1 text-xs dark:text-zinc-200">
              <input type="checkbox" checked={selected.includes(c)} onChange={() => toggle(c)} className="rounded" />
              {DIETARY_LABELS[c]}
            </label>
          ))}
        </div>
        <p className="hint mt-1">
          Vegan/vegetarian/halal/kosher are source-stated claims; gluten includes wheat/barley/rye/malt. Not certified.
        </p>
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-emerald-800 dark:text-emerald-300">
          Filtering by {selected.map((s) => DIETARY_LABELS[s]).join(", ")} — {selected.length} concern(s)
        </p>
      )}
    </div>
  );
}
