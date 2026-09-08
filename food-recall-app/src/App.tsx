import { useEffect, useState } from 'react'
import type { Recall, RecallClassification } from './types/recall'
import { fetchRecalls, getLastSynced, type FetchError } from './lib/api'
import RecallCard from './components/RecallCard'
import RecallDetail from './components/RecallDetail'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import { isNewRecall } from './lib/formatDate'
import { useWatchlist } from './hooks/useWatchlist'

export default function App(){
  const [recalls,setRecalls]=useState<Recall[]>([])
  const [total,setTotal]=useState(0)
  const [error,setError]=useState<FetchError | null>(null)
  const [isStale,setIsStale]=useState(false)
  const [isDemo,setIsDemo]=useState(false)
  const [loading,setLoading]=useState(true)
  const [query,setQuery]=useState('')
  const [debounced,setDebounced]=useState('')
  const [classification,setClassification]=useState<RecallClassification|''>('')
  const [status,setStatus]=useState('')
  const [state,setState]=useState('')
  const [selected,setSelected]=useState<Recall|null>(null)
  const [page,setPage]=useState(0)
  const [lastSynced,setLastSynced]=useState<string|null>(getLastSynced())
  const { items: watchlist } = useWatchlist()
  const limit=6

  useEffect(()=>{ const t=setTimeout(()=>setDebounced(query),400); return ()=>clearTimeout(t)},[query])

  async function load(){
    setLoading(true)
    setError(null)
    const {recalls: data, total: t, error: err, isStale: stale, isDemo: demo} = await fetchRecalls({search: debounced, limit, skip: page*limit})
    let filtered=data
    if(classification) filtered=filtered.filter(r=>r.classification===classification)
    if(status) filtered=filtered.filter(r=>r.status.toLowerCase()===status.toLowerCase())
    if(state) filtered=filtered.filter(r=>r.state.toLowerCase()===state.toLowerCase())
    setRecalls(filtered)
    setTotal(t)
    setError(err)
    setIsStale(stale)
    setIsDemo(demo)
    setLastSynced(getLastSynced())
    setLoading(false)
  }
  useEffect(()=>{ load() },[debounced, page])
  useEffect(()=>{ setPage(0); load() },[classification, status, state])

  const totalPages = Math.max(1, Math.ceil(total/limit))

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-amber-600 text-white px-3 py-2 rounded">Skip to content</a>
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Food Recall Tracker</h1>
            <p className="text-sm text-zinc-600">FDA Enforcement Reports • {isDemo ? 'DEMO — Fictional data' : error ? `Error: ${error.message}` : isStale ? 'Stale cached data' : 'Live openFDA data'} • {lastSynced ? `Synced ${new Date(lastSynced).toLocaleString()}` : 'Updated 2026'} {import.meta.env.VITE_OPENFDA_KEY ? '• 🔑 API key' : '• no key (40/min)'}</p>
          </div>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 max-w-sm">
            <strong>Active outbreaks:</strong> 16 FDA CORE investigations — Salmonella, Listeria, E. coli. <a className="underline" href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/major-product-recalls" target="_blank" rel="noreferrer">Major recalls</a>
          </div>
        </div>
        {isDemo && <div className="bg-purple-600 text-white text-center text-sm py-2">DEMO MODE — Fictional data for testing, not real FDA recalls. Add ?demo=1 to URL.</div>}
        {isStale && <div className="bg-amber-600 text-white text-center text-sm py-2">Stale cached data — live FDA request failed ({error?.code}). <button onClick={load} className="underline">Retry</button></div>}
      </header>

      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-[88px] space-y-4">
              <SearchBar value={query} onChange={setQuery} />
              <FilterPanel classification={classification} status={status} state={state} onClassification={setClassification} onStatus={setStatus} onState={setState} onClear={()=>{setClassification('');setStatus('');setState('');setQuery('')}} />
              <div className="text-xs text-zinc-600 bg-zinc-100 rounded-lg p-3">
                <p className="font-semibold">Classification</p>
                <p>Class I = reasonable probability of serious harm. ~70% of 2025 recalls.</p>
              </div>
            </div>
          </aside>

          <section className="flex-1 min-w-0" aria-live="polite" aria-busy={loading}>
            {loading && <p className="text-sm text-zinc-600 mb-3" role="status">Loading…</p>}
            {!loading && error && !isStale && recalls.length===0 && (
              <div className="text-center py-12">
                <p className="text-zinc-600" role="alert">Failed to load recalls: {error.message} ({error.code})</p>
                {error.retryable && <button onClick={load} className="mt-3 px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">Retry</button>}
                <p className="text-xs text-zinc-500 mt-2">{error.code === 'RATE_LIMIT' ? 'Rate limited — please retry shortly' : error.code === 'TIMEOUT' ? 'Request timed out after 8s' : 'Check connection and retry'}</p>
              </div>
            )}
            {!loading && !error && recalls.length===0 && <p className="text-zinc-600 text-center py-12" role="status">No recalls match your filters.</p>}
            {!loading && !(error && !isStale && recalls.length===0) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recalls.map(r=> <RecallCard key={r.id} recall={r} onSelect={setSelected} isNew={isNewRecall(r.recallInitiationDate)} watchlist={watchlist} />)}
                </div>
                <div className="flex items-center justify-between mt-6">
                  <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Previous page">Previous</button>
                  <span className="text-sm text-zinc-600" aria-live="polite">Page {page+1} / {totalPages} • {total} results</span>
                  <button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Next page">Next</button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {selected && <RecallDetail recall={selected} onClose={()=>setSelected(null)} />}

      <footer className="border-t bg-white text-xs text-zinc-600 px-4 py-4 text-center">
        Data: <a className="underline" href="https://open.fda.gov/apis/food/enforcement/" target="_blank">openFDA Food Enforcement API</a> ({import.meta.env.VITE_OPENFDA_KEY ? '240/min with key' : '40/min — set VITE_OPENFDA_KEY for 240/min'}) • Cached 6h • {lastSynced ? `last synced ${new Date(lastSynced).toLocaleDateString()}` : 'no sync yet'} • {isDemo ? 'DEMO fictional data' : 'Live data, no synthetic fallback'} • Not medical advice.
      </footer>
    </div>
  )
}
