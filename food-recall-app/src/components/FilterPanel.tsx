import type { RecallClassification } from '../types/recall'
import StateFilter from './StateFilter'

interface Props {
  classification: string
  status: string
  state: string
  onClassification: (v: RecallClassification | '') => void
  onStatus: (v: string) => void
  onState: (v: string) => void
  onClear: () => void
}

export default function FilterPanel({ classification, status, state, onClassification, onStatus, onState, onClear }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm dark:text-zinc-100">Filters</h3>
        <button onClick={onClear} className="text-xs underline text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200">Clear</button>
      </div>
      <div>
        <label className="text-xs font-medium dark:text-zinc-300">Classification</label>
        <select
          value={classification}
          onChange={e => onClassification(e.target.value as RecallClassification | '')}
          className="mt-1 w-full border dark:border-zinc-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100"
        >
          <option value="">All classes</option>
          <option value="Class I">Class I</option>
          <option value="Class II">Class II</option>
          <option value="Class III">Class III</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium dark:text-zinc-300">Status</label>
        <select
          value={status}
          onChange={e => onStatus(e.target.value)}
          className="mt-1 w-full border dark:border-zinc-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100"
        >
          <option value="">All statuses</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Terminated">Terminated</option>
        </select>
      </div>
      <StateFilter selected={state} onChange={onState} />
    </div>
  )
}
