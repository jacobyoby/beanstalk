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
import { getDietaryMatches, type DietaryConcern } from './lib/dietary'

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
  const [dietary, setDietary] = useState<DietaryConcern[]>([])
  const [selected, setSelected] = useState<Recall | null>(null)
  const [page, setPage] = useState(0)
  const [lastSynced, setLastSynced] = useState<string | null>(getLastSynced())
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const { items: watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const triggerReload = () => setReloadKey(k => k + 1)
  const limit = 6

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 400); return () => clearTimeout(t) }, [query])

  useEffect(() => {
    setPage(prev => (prev !== 0 ? 0 : prev))
  }, [classification, status, state, dietary, debounced])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    fetchRecalls({ search: debounced, limit, skip: page * limit, classification, status, state, dietary, signal: controller.signal }).then(({ recalls: data, total: t, error: err, isStale: stale, isDemo: demo }) => {
      if (requestId !== requestIdRef.current) return
      if (controller.signal.aborted) return
      setRecalls(data)
      setTotal(t)
      setError(err)
      setIsStale(stale)
      setIsDemo(demo)
      setLastSynced(getLastSynced())
      setLoading(false)
      // Notifications: only for newly observed, not for stale/demo/outbreak
      const newRecalls = data.filter(r => !seenIdsRef.current.has(r.id))
      if (newRecalls.length > 0 && !firstLoadRef.current && !stale && !demo && !err) {
        const watched = newRecalls.filter(r => matchesWatchlist(`${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`, watchlist).length > 0)
        if (watched.length > 0 && notificationsEnabled) {
          sendNotification(`${watched.length} newly observed recall${watched.length > 1 ? 's' : ''} matching watchlist`, watched.map(r => r.productDescription.slice(0, 80)).join('\n'))
        }
      }
      data.forEach(r => seenIdsRef.current.add(r.id))
      firstLoadRef.current = false
    }).catch(() => {
      if (requestId !== requestIdRef.current) return
      setLoading(false)
    })
    return () => controller.abort()
  }, [debounced, page, classification, status, state, dietary, reloadKey, watchlist, notificationsEnabled])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-amber-700 text-white px-3 py-2 rounded">Skip to content</a>
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Food Recall Tracker</h1>
            <p className="text-sm text-zinc-600">
              FDA Enforcement Reports (archival) • Sorted by report_date newest first • {isDemo ? 'DEMO — Fictional' : isStale ? 'Stale cached' : error ? `Error: ${error.code}` : 'Live'} • {lastSynced ? `Retrieved ${new Date(lastSynced).toLocaleString()}` : 'No sync yet'} • Key via server proxy (not in bundle)
            </p>
            <p className="text-xs text-zinc-500 mt-1">Source: openFDA Food Enforcement (2004-present). Status is FDA-reported, not verified real-time lifecycle. Not for public safety alerts.</p>
          </div>
          <div className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-700 max-w-sm">
            <strong>FDA scope:</strong> Enforcement archive; status may remain Ongoing after publication. Verify with FDA before action.
          </div>
        </div>
        {isDemo && <div className="bg-purple-600 text-white text-center text-sm py-2">DEMO MODE — Fictional data, not real FDA recalls. Add ?demo=1 to URL.</div>}
        {isStale && <div className="bg-amber-700 text-white text-center text-sm py-2" role="status">Stale cached data — live FDA request failed ({error?.code}). <button onClick={triggerReload} className="underline">Retry</button> <span className="opacity-80">• Cached from {lastSynced ? new Date(lastSynced).toLocaleString() : 'unknown'}</span></div>}
      </header>

      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-[88px] space-y-4">
              <SearchBar value={query} onChange={setQuery} />
              <FilterPanel classification={classification} status={status} state={state} dietary={dietary} onClassification={setClassification} onStatus={setStatus} onState={setState} onDietary={setDietary} onClear={()=>{setClassification('');setStatus('');setState('');setDietary([]);setQuery('')}} />
              <WatchlistPanel items={watchlist} onAdd={addToWatchlist} onRemove={removeFromWatchlist} />
              <div className="text-xs text-zinc-600 bg-zinc-100 rounded-lg p-3">
                <p className="font-semibold">Classification</p>
                <p>Class I = reasonable probability of serious adverse health consequences (21 CFR 7.3). Displayed per FDA record.</p>
              </div>
            </div>
          </aside>

          <section className="flex-1 min-w-0" aria-live="polite" aria-busy={loading}>
            {loading && <p className="text-sm text-zinc-600 mb-3" role="status">Loading…</p>}
            {!loading && error && !isStale && recalls.length===0 && (
              <div className="text-center py-12">
                <p className="text-zinc-600" role="alert">Failed to load recalls: {error.message} ({error.code})</p>
                {error.retryable && <button onClick={triggerReload} className="mt-3 px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-600">Retry</button>}
              </div>
            )}
            {!loading && !error && recalls.length===0 && <p className="text-zinc-600 text-center py-12" role="status">No recalls match your filters.</p>}
            {!loading && !(error && !isStale && recalls.length===0) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recalls.map(r=> <RecallCard key={r.id} recall={r} onSelect={setSelected} isNew={isNewRecall(r.recallInitiationDate)} watchlist={watchlist} dietary={dietary} />)}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="px-4 py-3 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 min-h-[44px] min-w-[44px]" aria-label="Previous page">Previous</button>
                  <span className="text-sm text-zinc-600" aria-live="polite">Page {page+1} / {totalPages} • {total} results {isStale ? '(stale)' : ''}</span>
                  <button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 py-3 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 min-h-[44px] min-w-[44px]" aria-label="Next page">Next</button>
                </div>
                <p className="text-xs text-zinc-500 text-center mt-2">Sorted by report_date desc • Dates shown are recall_initiation_date or report_date from FDA</p>
              </>
            )}
          </section>
        </div>
      </main>

      {selected && <RecallDetail recall={selected} onClose={()=>setSelected(null)} />}

      <footer className="border-t bg-white text-xs text-zinc-600 px-4 py-4 text-center">
        Data: <a className="underline" href="https://open.fda.gov/apis/food/enforcement/" target="_blank">openFDA Food Enforcement API</a> (key via server proxy, not in bundle; 40/min anonymously, higher with server env) • {isStale ? `Stale cached from ${lastSynced ? new Date(lastSynced).toLocaleDateString() : 'unknown'}` : lastSynced ? `Last retrieved ${new Date(lastSynced).toLocaleDateString()}` : 'No retrieval yet'} • Live vs cached distinguished per result set • Not medical advice.
      </footer>
    </div>
  )
}
