import { DIETARY_LABELS, type DietaryConcern } from '../lib/dietary'

const ALLERGENS: DietaryConcern[] = ['milk', 'eggs', 'fish', 'crustacean', 'tree_nuts', 'peanuts', 'wheat', 'soybeans', 'sesame']
const BROADER: DietaryConcern[] = ['gluten', 'vegan', 'vegetarian', 'halal', 'kosher']

interface Props {
  selected: DietaryConcern[]
  onChange: (next: DietaryConcern[]) => void
}

interface GroupProps {
  legend: string
  concerns: DietaryConcern[]
  selected: DietaryConcern[]
  onToggle: (c: DietaryConcern) => void
}

function ConcernGroup({ legend, concerns, selected, onToggle }: GroupProps) {
  return (
    <fieldset>
      <legend className="label mb-1">{legend}</legend>
      <div className="grid grid-cols-2 gap-x-2">
        {concerns.map(c => (
          <label key={c} className="flex min-h-[44px] cursor-pointer items-center gap-2 py-1 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={selected.includes(c)}
              onChange={() => onToggle(c)}
              className="h-4 w-4 shrink-0 rounded border-zinc-400 accent-emerald-700 focus:ring-2 focus:ring-emerald-600 dark:border-zinc-500"
            />
            {DIETARY_LABELS[c]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function DietaryFilter({ selected, onChange }: Props) {
  const toggle = (c: DietaryConcern) => {
    if (selected.includes(c)) onChange(selected.filter(x => x !== c))
    else onChange([...selected, c])
  }
  return (
    <div className="space-y-3">
      <ConcernGroup legend="FDA major allergens" concerns={ALLERGENS} selected={selected} onToggle={toggle} />
      <ConcernGroup legend="Other dietary terms" concerns={BROADER} selected={selected} onToggle={toggle} />
      {selected.length > 0 && (
        <p className="text-xs font-medium text-indigo-800 dark:text-indigo-300">
          Matching any of: {selected.map(s => DIETARY_LABELS[s]).join(', ')}
        </p>
      )}
      <details className="hint">
        <summary className="min-h-[44px] cursor-pointer select-none py-3">How dietary matching works</summary>
        <p className="mt-1">Looks for words in the product description or recall reason. Select more than one concern to see matches for any of them. A product can contain an allergen even if there is no match.</p>
        <p>Vegan, vegetarian, halal, and kosher are text matches, not verified certifications. Wheat and gluten are separate filters. Gluten searches also look for wheat, barley, rye, malt, and oats; a match does not confirm gluten content.</p>
      </details>
    </div>
  )
}
