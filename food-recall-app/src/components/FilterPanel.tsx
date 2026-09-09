import type { DietaryConcern } from "../lib/dietary";
import type { RecallClassification } from "../types/recall";
import DietaryFilter from "./DietaryFilter";
import StateFilter from "./StateFilter";

interface Props {
  classification: string;
  status: string;
  state: string;
  dietary: DietaryConcern[];
  onClassification: (v: RecallClassification | "") => void;
  onStatus: (v: string) => void;
  onState: (v: string) => void;
  onDietary: (v: DietaryConcern[]) => void;
  onClear: () => void;
}

export default function FilterPanel({
  classification,
  status,
  state,
  dietary,
  onClassification,
  onStatus,
  onState,
  onDietary,
  onClear,
}: Props) {
  return (
    <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-sm dark:text-zinc-100">Filters</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs underline text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-600 rounded min-h-[44px] min-w-[44px] px-3 py-2"
          aria-label="Clear all filters"
        >
          Clear
        </button>
      </div>
      <div>
        <label htmlFor="classification-select" className="text-xs font-medium dark:text-zinc-300">
          Classification
        </label>
        <select
          id="classification-select"
          value={classification}
          onChange={(e) => onClassification(e.target.value as RecallClassification | "")}
          className="mt-1 w-full border-zinc-400 dark:border-zinc-500 rounded-lg px-3 py-3 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 min-h-[44px]"
        >
          <option value="">All classes</option>
          <option value="Class I">Class I</option>
          <option value="Class II">Class II</option>
          <option value="Class III">Class III</option>
        </select>
      </div>
      <div>
        <label htmlFor="status-select" className="text-xs font-medium dark:text-zinc-300">
          Status
        </label>
        <select
          id="status-select"
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="mt-1 w-full border-zinc-400 dark:border-zinc-500 rounded-lg px-3 py-3 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 min-h-[44px]"
        >
          <option value="">All statuses</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>
      <StateFilter selected={state} onChange={onState} />
      <DietaryFilter selected={dietary} onChange={onDietary} />
    </div>
  );
}
