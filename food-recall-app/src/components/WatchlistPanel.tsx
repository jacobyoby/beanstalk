import { useState } from 'react'

interface Props {
  items: string[]
  onAdd: (term: string) => void
  onRemove: (term: string) => void
}

export default function WatchlistPanel({ items, onAdd, onRemove }: Props) {
  const [input, setInput] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = input.trim()
    if (term) {
      onAdd(term)
      setInput('')
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm dark:text-zinc-100">Watchlist</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{items.length} term{items.length !== 1 ? 's' : ''}</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Brand, keyword, allergen…"
          className="flex-1 border dark:border-zinc-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button type="submit" className="px-3 py-2 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 transition min-h-[44px] min-w-[44px]">Add</button>
      </form>

      {items.length === 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">Add keywords to highlight matching records.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {items.map(term => (
          <span key={term} className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700 rounded-full px-2 py-1">
            {term}
            <button onClick={() => onRemove(term)} className="hover:text-red-600 dark:hover:text-red-400 font-bold min-h-[24px] min-w-[24px] flex items-center justify-center" aria-label={`Remove ${term}`}>×</button>
          </span>
        ))}
      </div>
    </div>
  )
}
