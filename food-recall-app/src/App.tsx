import { useEffect, useState, useRef } from 'react'
import type { Recall, RecallClassification } from './types/recall'
import { fetchRecalls, getLastSynced, isDemoMode, type FetchError } from './lib/api'
import { matchesWatchlist } from './lib/watchlist'
import { getPermissionStatus, requestNotificationPermission, sendNotification } from './lib/notifications'
import RecallCard from './components/RecallCard'
import RecallDetail from './components/RecallDetail'
import SearchBar from './components/SearchBar'
import FilterPanel, { countActiveFilters } from './components/FilterPanel'
import WatchlistPanel from './components/WatchlistPanel'
import DataStatus from './components/DataStatus'
import SkeletonGrid from './components/SkeletonGrid'
import { isNewRecall } from './lib/formatDate'
import { useWatchlist } from './hooks/useWatchlist'
import { useDarkMode } from './hooks/useDarkMode'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { DietaryConcern } from './lib/dietary'

const PAGE_SIZE = 6
const FDA_MAX_SKIP = 25000

function formatRetrieved(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : 'unknown'
}

export default function App() {
  const [recalls, setRecalls] = useState<Recall[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<FetchError | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [isDemo, setIsDemo] = useState(isDemoMode)
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
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => getPermissionStatus() === 'granted')
  const { items: watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist()
  const { dark, toggle: toggleDark } = useDarkMode()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const seenIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const triggerReload = () => setReloadKey(k => k + 1)
  const alertsSupported = getPermissionStatus() !== 'unsupported'
  const maxPage = Math.floor(FDA_MAX_SKIP / PAGE_SIZE)
  const rawTotalPages = Math.ceil(total / PAGE_SIZE)
  const totalPages = Math.max(1, Math.min(rawTotalPages, maxPage + 1))
  const reachableTotal = Math.min(total, (maxPage + 1) * PAGE_SIZE)
  const hasTruncatedWindow = total > reachableTotal
  const activeFilters = countActiveFilters(classification, status, state, dietary)

  useEffect(() => { const t = setTimeout(() => setDebounced(query), 400); return () => clearTimeout(t) }, [query])

  useEffect(() => {
    setPage(prev => {
      if (prev !== 0) return 0
      return prev
    })
  }, [classification, status, state, dietary, debounced])

  // Clamp page when total shrinks (e.g., narrow search from later page)
  useEffect(() => {
    if (page >= totalPages) {
      setPage(totalPages - 1)
    }
  }, [totalPages, page])

  useEffect(() => {
    const requestId = ++requestIdRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    fetchRecalls({ search: debounced, limit: PAGE_SIZE, skip: Math.min(page * PAGE_SIZE, FDA_MAX_SKIP), classification, status, state, dietary, signal: controller.signal }).then(({ recalls: data, total: t, error: err, isStale: stale, isDemo: demo, lastSynced: retrievedAt }) => {
      if (requestId !== requestIdRef.current) return
      if (controller.signal.aborted) return
      setRecalls(data)
      setTotal(t)
      setError(err)
      setIsStale(stale)
      setIsDemo(demo)
      setLastSynced(retrievedAt)
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

  const clearAll = () => {
    setClassification('')
    setStatus('')
    setState('')
    setDietary([])
    setQuery('')
  }
  const enableAlerts = () => {
    requestNotificationPermission().then(granted => setNotificationsEnabled(granted))
  }

  const showError = !loading && error !== null && !isStale && recalls.length === 0
  const showEmpty = !loading && error === null && recalls.length === 0
  const showResults = !loading && !showError && recalls.length > 0

  const sidebarPanels = (
    <>
      <FilterPanel
        classification={classification}
        status={status}
        state={state}
        dietary={dietary}
        onClassification={setClassification}
        onStatus={setStatus}
        onState={setState}
        onDietary={setDietary}
        onClear={clearAll}
      />
      <WatchlistPanel
        items={watchlist}
        onAdd={addToWatchlist}
        onRemove={removeFromWatchlist}
        alertsEnabled={notificationsEnabled}
        alertsSupported={alertsSupported}
        onEnableAlerts={enableAlerts}
      />
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white">Skip to content</a>

      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <h1 className="flex items-baseline gap-3">
            <span className="text-xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300">Beanstalk</span>
            <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">FDA food recall explorer</span>
          </h1>
          <div className="flex items-center gap-2">
            <DataStatus isDemo={isDemo} isStale={isStale} error={error} lastSynced={lastSynced} />
            <button
              type="button"
              onClick={toggleDark}
              className="btn btn-quiet px-3"
              aria-pressed={dark}
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {dark ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
        {isDemo && (
          <div className="bg-violet-700 px-4 py-2 text-center text-sm font-medium text-white" role="status">
            Interactive demo. All records and organizations are fictional.
          </div>
        )}
        {isStale && (
          <div className="bg-amber-700 px-4 py-2 text-center text-sm text-white" role="status">
            Stale cached data. The live FDA request failed ({error?.code}).{' '}
            <button type="button" onClick={triggerReload} className="font-medium underline underline-offset-2">Retry</button>
            <span> · cached from {formatRetrieved(lastSynced)}</span>
          </div>
        )}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
          <aside aria-label="Search and filters" className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
            <SearchBar value={query} onChange={setQuery} />
            {isDesktop ? sidebarPanels : (
              <details className="panel">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50 [&::-webkit-details-marker]:hidden">
                  <span>Filters and watchlist</span>
                  <span className={activeFilters > 0 ? 'chip chip-personal' : 'chip chip-neutral'}>
                    {activeFilters > 0 ? `${activeFilters} active` : 'Show'}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-zinc-100 p-3 dark:border-zinc-800">{sidebarPanels}</div>
              </details>
            )}
          </aside>

          <section aria-label="Recall results" aria-busy={loading} className="min-w-0">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status" aria-live="polite">
                {loading
                  ? 'Loading recalls…'
                  : hasTruncatedWindow
                    ? `${reachableTotal.toLocaleString()} of ${total.toLocaleString()} recalls reachable`
                    : `${total.toLocaleString()} ${total === 1 ? 'recall' : 'recalls'}`}
                {!loading && ' · newest first'}
                {!loading && isStale && ' · stale'}
              </p>
              <p className="hint">{isDemo ? 'Fictional examples for exploring the interface.' : 'FDA enforcement archive · status as reported by FDA, not verified · not a public safety alert'}</p>
            </div>

            {loading && <SkeletonGrid />}

            {showError && error && (
              <div className="panel px-6 py-12 text-center">
                <p className="font-medium text-zinc-900 dark:text-zinc-50" role="alert">Could not load recalls</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{error.message} ({error.code})</p>
                {error.retryable && <button type="button" onClick={triggerReload} className="btn btn-primary mt-4">Retry</button>}
              </div>
            )}

            {showEmpty && (
              <div className="panel px-6 py-12 text-center" role="status">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">No recalls match</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Try fewer filters or a broader search term.</p>
                {(activeFilters > 0 || query) && <button type="button" onClick={clearAll} className="btn mt-4">Clear filters</button>}
              </div>
            )}

            {showResults && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {recalls.map(r => (
                    <RecallCard key={r.id} recall={r} onSelect={setSelected} isNew={!isDemo && isNewRecall(r.recallInitiationDate)} watchlist={watchlist} dietary={dietary} />
                  ))}
                </div>
                <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
                  <button type="button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="btn" aria-label="Previous page">Previous</button>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">Page {page + 1} of {totalPages}</p>
                  <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="btn" aria-label="Next page">Next</button>
                </nav>
                {hasTruncatedWindow && (
                  <p className="hint mt-3 text-center">
                    Showing the first {reachableTotal.toLocaleString()} of {total.toLocaleString()}. FDA's offset limit of {FDA_MAX_SKIP.toLocaleString()} stops paging after page {maxPage + 1}; narrow the filters to see more.
                  </p>
                )}
                {!isDemo && <p className="hint mt-2 text-center">Sorted by report_date, newest first. Dates shown are recall_initiation_date or report_date from FDA.</p>}
              </>
            )}
          </section>
        </div>
      </main>

      {selected && <RecallDetail recall={selected} isDemo={isDemo} onClose={() => setSelected(null)} />}

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 text-sm text-zinc-600 sm:px-6 dark:text-zinc-400">
          {!isDemo && <details>
            <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">About this data</summary>
            <div className="mt-2 max-w-prose space-y-2">
              <p>
                Source: <a className="underline underline-offset-2" href="https://open.fda.gov/apis/food/enforcement/" target="_blank" rel="noreferrer">openFDA Food Enforcement API</a>, 2004 to present.
                It is an enforcement archive: status is FDA-reported and may remain Ongoing after publication. It is not a public safety alert feed; verify with FDA before acting.
              </p>
              <p>
                {isStale ? `Stale cache from ${formatRetrieved(lastSynced)}` : lastSynced ? `Last retrieved ${formatRetrieved(lastSynced)}` : 'No retrieval yet'}. Live and cached results are labelled per result set.
              </p>
              <p>Class I means a reasonable probability of serious adverse health consequences (21 CFR 7.3). Classes are displayed exactly as the FDA record states them.</p>
              <p>
                Meat, poultry, and egg products are regulated by <a className="underline underline-offset-2" href="https://www.fsis.usda.gov/recalls" target="_blank" rel="noreferrer">USDA FSIS</a> and are not in this dataset.
              </p>
            </div>
          </details>}
          <p>{isDemo ? 'Fictional data for interface preview. Do not use this demo to assess food safety.' : 'Not medical advice.'}</p>
        </div>
      </footer>
    </div>
  )
}
