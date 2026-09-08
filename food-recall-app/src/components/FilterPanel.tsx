import type { RecallClassification } from '../types/recall'
export default function FilterPanel({classification,status,onClassification,onStatus,onClear}:{classification:string;status:string;onClassification:(v:RecallClassification|'' )=>void;onStatus:(v:string)=>void;onClear:()=>void}){
  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center"><h3 className="font-semibold text-sm">Filters</h3><button onClick={onClear} className="text-xs underline">Clear</button></div>
      <div>
        <label className="text-xs font-medium">Classification</label>
        <select value={classification} onChange={e=>onClassification(e.target.value as any)} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
          <option value="">All classes</option><option value="Class I">Class I</option><option value="Class II">Class II</option><option value="Class III">Class III</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-medium">Status</label>
        <select value={status} onChange={e=>onStatus(e.target.value)} className="mt-1 w-full border rounded-lg px-2 py-2 text-sm">
          <option value="">All statuses</option><option value="Ongoing">Ongoing</option><option value="Completed">Completed</option><option value="Terminated">Terminated</option>
        </select>
      </div>
    </div>
  )
}
