import { useEffect, useState, useRef } from 'react'
import type { Recall, RecallClassification } from './types/recall'
import { fetchRecalls, getLastSynced, type FetchError } from './lib/api'
import { matchesWatchlist } from './lib/watchlist'
import { requestNotificationPermission, sendNotification } from './lib/notifications'
import RecallCard from './components/RecallCard'
import RecallDetail from './components/RecallDetail'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import WatchlistPanel from './components/WatchlistPanel'
import { isNewRecall } from './lib/formatDate'
import { useWatchlist } from './hooks/useWatchlist'

export default function App() {
  const [recalls, setRecalls] = useState<Recall[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<FetchError | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [classification, setClassification] = useState<RecallClassification | ''>('')
  const [status, setStatus] = useState('')
  const [state, setState] = useState('')
  const [selected, setSelected] = useState<Recall | null>(null)
  const [page, setPage] = useState(0)
  const [lastSynced, setLastSynced] = useState<string | null>(getLastSynced())
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const { items: watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)
  const limit = 6

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(t)
  }, [query])

  async function load() {
    setLoading(true)
    setError(null)
    const { recalls: data, total: t, error: err, isStale: stale, isDemo: demo } = await fetchRecalls({ search: debounced, limit, skip: page * limit })
    let filtered = data
    if (classification) filtered = filtered.filter(r => r.classification === classification)
    if (status) filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase())
    if (state) filtered = filtered.filter(r => r.state.toLowerCase() === state.toLowerCase())
    setRecalls(filtered)
    setTotal(t)
    setError(err)
    setIsStale(stale)
    setIsDemo(demo)
    setLastSynced(getLastSynced())
    setLoading(false)

    const newRecalls = filtered.filter(r => !seenIdsRef.current.has(r.id))
    if (newRecalls.length > 0 && !firstLoadRef.current) {
      const watchedRecalls = newRecalls.filter(r =>
        matchesWatchlist(
          `${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`,
          watchlist
        ).length > 0
      )
      if (watchedRecalls.length > 0 && notificationsEnabled) {
        sendNotification(
          `${watchedRecalls.length} new watched recall${watchedRecalls.length > 1 ? 's' : ''}`,
          watchedRecalls.map(r => r.productDescription.slice(0, 80)).join('\n')
        )
      }
    }
    filtered.forEach(r => seenIdsRef.current.add(r.id))
    firstLoadRef.current = false
  }

  useEffect(() => { load() }, [debounced, page])
  useEffect(() => { setPage(0); load() }, [classification, status, state])

  async function enableNotifications() {
    const granted = await requestNotificationPermission()
    setNotificationsEnabled(granted)
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-amber-600 text-white px-3 py-2 rounded">Skip to content</a>
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">🍎 Ponder</h1>
            <p className="text-sm text-zinc-600">
              Food Recall Alerts {isDemo ? '• DEMO' : error ? `• Error: ${error.message}` : isStale ? '• Stale cache' : '• Live'} {lastSynced ? `• Synced ${new Date(lastSynced).toLocaleString()}` : ''} {import.meta.env.VITE_OPENFDA_KEY ? '• 🔑' : '• no key'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!notificationsEnabled ? (
              <button onClick={enableNotifications} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Enable browser notifications for watched recalls">🔔 Enable Alerts</button>
            ) : (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-2" role="status">✓ Alerts on</span>
            )}
          </div>
        </div>
        {isDemo && <div className="bg-purple-600 text-white text-center text-sm py-2">DEMO MODE — Fictional data</div>}
        {isStale && <div className="bg-amber-600 text-white text-center text-sm py-2">Stale cache — request failed ({error?.code}). <button onClick={load} className="underline">Retry</button></div>}
      </header>
      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-[88px] space-y-4">
              <SearchBar value={query} onChange={setQuery} />
              <FilterPanel classification={classification} status={status} state={state} onClassification={setClassification} onStatus={setStatus} onState={setState} onClear={() => { setClassification(''); setStatus(''); setState(''); setQuery('') }} />
              <WatchlistPanel items={watchlist} onAdd={addToWatchlist} onRemove={removeFromWatchlist} />
            </div>
          </aside>
          <section className="flex-1 min-w-0" aria-live="polite" aria-busy={loading}>
            {loading && <p className="text-sm text-zinc-600 mb-3" role="status">Loading…</p>}
            {!loading && error && !isStale && recalls.length === 0 && (
              <div className="text-center py-12">
                <p className="text-zinc-600" role="alert">Failed to load: {error.message} ({error.code})</p>
                {error.retryable && <button onClick={load} className="mt-3 px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">Retry</button>}
              </div>
            )}
            {!loading && !error && recalls.length === 0 && <p className="text-zinc-600 text-center py-12" role="status">No recalls match your filters.</p>}
            {!loading && !(error && !isStale && recalls.length === 0) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recalls.map(r => <RecallCard key={r.id} recall={r} onSelect={setSelected} isNew={isNewRecall(r.recallInitiationDate)} watchlist={watchlist} />)}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Previous page">Previous</button>
                  <span className="text-sm text-zinc-600" aria-live="polite">Page {page + 1} / {totalPages} • {total} results</span>
                  <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Next page">Next</button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      {selected && <RecallDetail recall={selected} onClose={() => setSelected(null)} />}
      <footer className="border-t bg-white text-xs text-zinc-600 px-4 py-4 text-center">
        Data: <a className="underline" href="https://open.fda.gov/apis/food/enforcement/" target="_blank">openFDA</a> • Cached 6h • {lastSynced ? `synced ${new Date(lastSynced).toLocaleDateString()}` : 'no sync'} • Not medical advice.
      </footer>
    </div>
  )
}
