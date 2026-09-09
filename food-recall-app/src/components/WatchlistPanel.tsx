import { useState } from 'react'

interface Props {
  items: string[]
  onAdd: (term: string) => void
  onRemove: (term: string) => void
  alertsEnabled: boolean
  alertsSupported: boolean
  onEnableAlerts: () => void
}

export default function WatchlistPanel({ items, onAdd, onRemove, alertsEnabled, alertsSupported, onEnableAlerts }: Props) {
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
    <div className="panel">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Watchlist</h2>
        <span className="hint">{items.length} {items.length === 1 ? 'keyword' : 'keywords'}</span>
      </div>

      <div className="space-y-3 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="watchlist-input" className="sr-only">Watchlist keyword</label>
          <input
            id="watchlist-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Add a keyword"
            autoComplete="off"
            className="input min-w-0 flex-1"
          />
          <button type="submit" className="btn btn-primary shrink-0">Add</button>
        </form>

        {items.length === 0 ? (
          <p className="hint">Add a keyword to mark matching recalls with a “Watching” tag.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Watchlist terms">
            {items.map(term => (
              <li key={term} className="chip chip-personal pr-0.5">
                {term}
                <button
                  type="button"
                  onClick={() => onRemove(term)}
                  className="ml-0.5 flex h-6 w-6 items-center justify-center rounded text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:text-indigo-300 dark:hover:bg-indigo-900"
                  aria-label={`Remove ${term} from watchlist`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {alertsSupported && (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="hint">Browser alerts: {alertsEnabled ? 'on' : 'off'}. Newly seen watchlist matches can trigger an alert while the app is open. No checks run in the background.</p>
            {!alertsEnabled && (
              <button type="button" onClick={onEnableAlerts} className="btn btn-quiet shrink-0 px-3 text-xs" aria-label="Enable browser alerts while the app is open">Enable</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
