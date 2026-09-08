import type { Recall } from '../types/recall'
import { formatRecallDate } from '../lib/formatDate'

interface Props {
  recall: Recall
  onClose: () => void
}

export default function RecallDetail({ recall, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="recall-title">
      <div className="flex-1 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white dark:bg-zinc-800 h-full overflow-auto p-6 shadow-xl">
        <div className="flex justify-between items-start gap-4">
          <h2 id="recall-title" className="text-lg font-bold dark:text-zinc-100">{recall.productDescription}</h2>
          <button onClick={onClose} className="border dark:border-zinc-600 rounded-lg px-3 py-1 text-sm shrink-0 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Close recall details">Close</button>
        </div>
        <dl className="mt-4 space-y-3 text-sm dark:text-zinc-300">
          <div><dt className="font-semibold">Recall #</dt><dd>{recall.recallNumber} (Event {recall.eventId})</dd></div>
          <div><dt className="font-semibold">Classification</dt><dd>{recall.classification}</dd></div>
          <div><dt className="font-semibold">Status</dt><dd>{recall.status}</dd></div>
          <div><dt className="font-semibold">Reason</dt><dd>{recall.reasonForRecall}</dd></div>
          <div><dt className="font-semibold">Firm</dt><dd>{recall.recallingFirm} — {recall.city}, {recall.state}</dd></div>
          <div><dt className="font-semibold">Distribution</dt><dd>{recall.distributionPattern}</dd></div>
          <div><dt className="font-semibold">Code Info</dt><dd className="whitespace-pre-wrap break-words max-h-64 overflow-auto border rounded p-2 bg-zinc-50 dark:bg-zinc-900 text-xs select-text" tabIndex={0}>{recall.codeInfo || '—'}</dd><dd className="text-xs text-zinc-500 mt-1">Source: FDA code_info</dd></div>
          {recall.moreCodeInfo && <div><dt className="font-semibold">More Code Info (continuation)</dt><dd className="whitespace-pre-wrap break-words max-h-64 overflow-auto border rounded p-2 bg-zinc-50 dark:bg-zinc-900 text-xs select-text" tabIndex={0}>{recall.moreCodeInfo}</dd><dd className="text-xs text-zinc-500 mt-1">Source: FDA more_code_info — lot 8L5M30 appears only here</dd></div>}
          <div><dt className="font-semibold">Initiation Date</dt><dd>{formatRecallDate(recall.recallInitiationDate)}</dd></div>
          <div><dt className="font-semibold">Voluntary/Mandated</dt><dd>{recall.voluntaryMandated}</dd></div>
        </dl>
        <a
          href={`https://api.fda.gov/food/enforcement.json?search=recall_number:"${recall.recallNumber}"`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm underline text-blue-600 dark:text-blue-400"
        >
          View raw openFDA record →
        </a>
      </div>
    </div>
  )
}
