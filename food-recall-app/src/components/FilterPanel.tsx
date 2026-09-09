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
    <div className="panel space-y-3 p-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-sm dark:text-zinc-100">Filters</h2>
        <button type="button" onClick={onClear} className="btn btn-quiet px-3 text-xs" aria-label="Clear all filters">
          Clear
        </button>
      </div>
      <div>
        <label htmlFor="classification-select" className="label mb-1">
          Classification
        </label>
        <select
          id="classification-select"
          value={classification}
          onChange={(e) => onClassification(e.target.value as RecallClassification | "")}
          className="input"
        >
          <option value="">All classes</option>
          <option value="Class I">Class I</option>
          <option value="Class II">Class II</option>
          <option value="Class III">Class III</option>
        </select>
      </div>
      <div>
        <label htmlFor="status-select" className="label mb-1">
          Status
        </label>
        <p className="hint mt-0.5">As published by openFDA — not live FDA lifecycle</p>
        <select id="status-select" value={status} onChange={(e) => onStatus(e.target.value)} className="input mt-1">
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
