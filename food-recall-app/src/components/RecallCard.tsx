import type { Recall } from '../types/recall'
import { formatRecallDate, isNewRecall } from '../lib/formatDate'
import { matchesWatchlist } from '../lib/watchlist'

interface Props {
  recall: Recall
  onSelect: (r: Recall) => void
  isNew: boolean
  watchlist: string[]
}

function badge(c: string) {
  if (c === 'Class I') return 'bg-red-600 text-white'
  if (c === 'Class II') return 'bg-amber-500 text-white'
  return 'bg-zinc-500 text-white'
}

export default function RecallCard({ recall, onSelect, isNew, watchlist }: Props) {
  const matchedTerms = matchesWatchlist(
    `${recall.productDescription} ${recall.reasonForRecall} ${recall.recallingFirm}`,
    watchlist
  )
  const isWatched = matchedTerms.length > 0

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(recall)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(recall)
        }
      }}
      aria-label={`View recall ${recall.recallNumber}: ${recall.productDescription}`}
      className={`bg-white dark:bg-zinc-800 border rounded-xl p-4 hover:shadow-md cursor-pointer transition flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
        isNew ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800' : 'dark:border-zinc-700'
      }`}
    >
      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full ${badge(recall.classification)}`}>{recall.classification}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 border dark:border-zinc-600">{recall.status}</span>
        {recall.state && (
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 border dark:border-zinc-600">{recall.state}</span>
        )}
        {isNew && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium">NEW</span>
        )}
        {isWatched && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium">🔔 Watching</span>
        )}
      </div>
      <h3 className="font-semibold text-sm leading-tight line-clamp-2 dark:text-zinc-100">{recall.productDescription}</h3>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{recall.reasonForRecall}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{recall.recallingFirm} • {formatRecallDate(recall.recallInitiationDate)}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Dist: {recall.distributionPattern}</p>
      {isWatched && matchedTerms.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Matches: {matchedTerms.join(', ')}</p>
      )}
    </article>
  )
}
