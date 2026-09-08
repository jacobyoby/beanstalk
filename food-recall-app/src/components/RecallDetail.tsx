import type { Recall } from '../types/recall'
export default function RecallDetail({recall,onClose}:{recall:Recall;onClose:()=>void}){
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-auto p-6 shadow-xl">
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-lg font-bold">{recall.productDescription}</h2>
          <button onClick={onClose} className="border rounded-lg px-3 py-1 text-sm shrink-0">Close</button>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div><dt className="font-semibold">Recall #</dt><dd>{recall.recallNumber} (Event {recall.eventId})</dd></div>
          <div><dt className="font-semibold">Classification</dt><dd>{recall.classification}</dd></div>
          <div><dt className="font-semibold">Status</dt><dd>{recall.status}</dd></div>
          <div><dt className="font-semibold">Reason</dt><dd>{recall.reasonForRecall}</dd></div>
          <div><dt className="font-semibold">Firm</dt><dd>{recall.recallingFirm} — {recall.city}, {recall.state}</dd></div>
          <div><dt className="font-semibold">Distribution</dt><dd>{recall.distributionPattern}</dd></div>
          <div><dt className="font-semibold">Code Info</dt><dd>{recall.codeInfo || '—'}</dd></div>
          <div><dt className="font-semibold">Initiation Date</dt><dd>{recall.recallInitiationDate}</dd></div>
          <div><dt className="font-semibold">Voluntary/Mandated</dt><dd>{recall.voluntaryMandated}</dd></div>
        </dl>
        <a href={`https://api.fda.gov/food/enforcement.json?search=recall_number:"${recall.recallNumber}"`} target="_blank" rel="noreferrer" className="mt-6 inline-block text-sm underline">View raw openFDA record</a>
      </div>
    </div>
  )
}
