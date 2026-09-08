import { useEffect, useState, useMemo } from 'react'
import type { Recall, RecallClassification } from './types/recall'
import { fetchRecalls } from './lib/api'
import { mockRecalls } from './lib/mockData'
import RecallCard from './components/RecallCard'
import RecallDetail from './components/RecallDetail'
import SearchBar from './components/SearchBar'
import FilterPanel from './components/FilterPanel'
import { isNewRecall } from './lib/formatDate'
import { useWatchlist } from './hooks/useWatchlist'

export default function App(){
  const [recalls,setRecalls]=useState<Recall[]>(mockRecalls)
  const [total,setTotal]=useState(mockRecalls.length)
  const [fromMock,setFromMock]=useState(true)
  const [loading,setLoading]=useState(false)
  const [query,setQuery]=useState('')
  const [debounced,setDebounced]=useState('')
  const [classification,setClassification]=useState<RecallClassification|''>('')
  const [status,setStatus]=useState('')
  const [state,setState]=useState('')
  const [selected,setSelected]=useState<Recall|null>(null)
  const [page,setPage]=useState(0)
  const { items: watchlist } = useWatchlist()
  const limit=6

  useEffect(()=>{ const t=setTimeout(()=>setDebounced(query),400); return ()=>clearTimeout(t)},[query])

  async function load(){
    setLoading(true)
    const {recalls: data, total: t, fromMock: fm} = await fetchRecalls({search: debounced, limit, skip: page*limit})
    // client-side filter for classification/status when using mock (openFDA search doesn't cover them efficiently)
    // For live data we also filter client-side for consistency
    let filtered=data
    if(classification) filtered=filtered.filter(r=>r.classification===classification)
    if(status) filtered=filtered.filter(r=>r.status.toLowerCase()===status.toLowerCase())
    if(state) filtered=filtered.filter(r=>r.state.toLowerCase()===state.toLowerCase())
    setRecalls(filtered)
    setTotal(t)
    setFromMock(fm)
    setLoading(false)
  }
  useEffect(()=>{ load() },[debounced, page])
  useEffect(()=>{ setPage(0); load() },[classification, status, state])

  const totalPages = Math.max(1, Math.ceil(total/limit))

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">🍎 Food Recall Tracker</h1>
            <p className="text-sm text-zinc-500">FDA Enforcement Reports • {fromMock ? 'Mock data (offline fallback)' : 'Live openFDA data'} • Updated 2026</p>
          </div>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-900 max-w-sm">
            <strong>Active outbreaks:</strong> 16 FDA CORE investigations — Salmonella, Listeria, E. coli. <a className="underline" href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/major-product-recalls" target="_blank" rel="noreferrer">Major recalls</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-[88px] space-y-4">
              <SearchBar value={query} onChange={setQuery} />
              <FilterPanel classification={classification} status={status} state={state} onClassification={setClassification} onStatus={setStatus} onState={setState} onClear={()=>{setClassification('');setStatus('');setState('');setQuery('')}} />
              <div className="text-xs text-zinc-500 bg-zinc-100 rounded-lg p-3">
                <p className="font-semibold">Classification</p>
                <p>Class I = reasonable probability of serious harm. ~70% of 2025 recalls.</p>
              </div>
            </div>
          </aside>

          {/* Content */}
          <section className="flex-1 min-w-0">
            {loading && <p className="text-sm text-zinc-500 mb-3">Loading…</p>}
            {!loading && recalls.length===0 && <p className="text-zinc-500 text-center py-12">No recalls match your filters.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recalls.map(r=> <RecallCard key={r.id} recall={r} onSelect={setSelected} isNew={isNewRecall(r.recallInitiationDate)} watchlist={watchlist} />)}
            </div>
            <div className="flex items-center justify-between mt-6">
              <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white">Previous</button>
              <span className="text-sm text-zinc-600">Page {page+1} / {totalPages} • {total} results</span>
              <button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 py-2 border rounded-lg disabled:opacity-40 bg-white">Next</button>
            </div>
          </section>
        </div>
      </main>

      {selected && <RecallDetail recall={selected} onClose={()=>setSelected(null)} />}

      <footer className="border-t bg-white text-xs text-zinc-500 px-4 py-4 text-center">
        Data: <a className="underline" href="https://open.fda.gov/apis/food/enforcement/" target="_blank">openFDA Food Enforcement API</a> with mock fallback. Not medical advice.
      </footer>
    </div>
  )
}
