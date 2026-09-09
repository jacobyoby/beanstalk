import { useEffect, useRef, useState } from "react";
import BeanstalkMark from "./components/BeanstalkMark";
import EventCard from "./components/EventCard";
import EventDetail from "./components/EventDetail";
import FilterPanel from "./components/FilterPanel";
import PantrySketch from "./components/PantrySketch";
import RecallCard from "./components/RecallCard";
import RecallDetail from "./components/RecallDetail";
import SearchBar from "./components/SearchBar";
import WatchlistPanel from "./components/WatchlistPanel";
import { useDarkMode } from "./hooks/useDarkMode";
import { useWatchlist } from "./hooks/useWatchlist";
import { type FetchError, fetchRecalls, getLastSynced } from "./lib/api";
import type { DietaryConcern } from "./lib/dietary";
import { eventSearchText, fetchAdverseEvents, getEventLastSynced } from "./lib/events";
import { isNewRecall } from "./lib/formatDate";
import { getPermissionStatus, requestNotificationPermission, sendNotification } from "./lib/notifications";
import { type DateSortDirection, sortRecallsByDate } from "./lib/sortRecalls";
import { matchesWatchlist } from "./lib/watchlist";
import type { AdverseEvent } from "./types/event";
import { FDA_EVENT_DISCLAIMER } from "./types/event";
import { OPENFDA_AS_PUBLISHED, type Recall, type RecallClassification } from "./types/recall";

type AppTab = "recalls" | "events";

export default function App() {
  const [tab, setTab] = useState<AppTab>("recalls");

  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<FetchError | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classification, setClassification] = useState<RecallClassification | "">("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const [dietary, setDietary] = useState<DietaryConcern[]>([]);
  const [selected, setSelected] = useState<Recall | null>(null);
  const [page, setPage] = useState(0);
  const [dateSort, setDateSort] = useState<DateSortDirection>("newest");
  const [lastSynced, setLastSynced] = useState<string | null>(getLastSynced());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;
    try {
      return localStorage.getItem("notificationsEnabled") === "true";
    } catch {
      return true;
    }
  });
  const { items: watchlist, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();
  const { dark, toggle: toggleDark } = useDarkMode();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;
  const notificationsEnabledRef = useRef(notificationsEnabled);
  notificationsEnabledRef.current = notificationsEnabled;
  const [reloadKey, setReloadKey] = useState(0);
  const triggerReload = () => setReloadKey((k) => k + 1);
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    try {
      localStorage.setItem("notificationsEnabled", String(granted));
    } catch {
      /* storage unavailable */
    }
  };

  // Adverse events (Early Signals) state
  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventError, setEventError] = useState<FetchError | null>(null);
  const [eventIsStale, setEventIsStale] = useState(false);
  const [eventIsDemo, setEventIsDemo] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventPage, setEventPage] = useState(0);
  const [eventLastSynced, setEventLastSynced] = useState<string | null>(getEventLastSynced());
  const [selectedEvent, setSelectedEvent] = useState<AdverseEvent | null>(null);
  const eventRequestIdRef = useRef(0);
  const eventAbortRef = useRef<AbortController | null>(null);
  const eventSeenIdsRef = useRef<Set<string>>(new Set());
  const eventFirstLoadRef = useRef(true);
  const [eventReloadKey, setEventReloadKey] = useState(0);
  const triggerEventReload = () => setEventReloadKey((k) => k + 1);

  const limit = 6;
  const FDA_MAX_SKIP = 25000;
  const maxPage = Math.floor(FDA_MAX_SKIP / limit);
  const rawTotalPages = Math.ceil(total / limit);
  const totalPages = Math.max(1, Math.min(rawTotalPages, maxPage + 1));
  const reachableTotal = Math.min(total, (maxPage + 1) * limit);
  const hasTruncatedWindow = total > reachableTotal;

  const eventRawTotalPages = Math.ceil(eventTotal / limit);
  const eventTotalPages = Math.max(1, Math.min(eventRawTotalPages, maxPage + 1));
  const eventReachableTotal = Math.min(eventTotal, (maxPage + 1) * limit);
  const eventHasTruncatedWindow = eventTotal > eventReachableTotal;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    void classification;
    void status;
    void state;
    void dietary;
    void debounced;
    void tab;
    setPage((prev) => {
      if (prev !== 0) return 0;
      return prev;
    });
    setEventPage((prev) => {
      if (prev !== 0) return 0;
      return prev;
    });
  }, [classification, status, state, dietary, debounced, tab]);

  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [totalPages, page]);

  useEffect(() => {
    if (eventPage >= eventTotalPages) setEventPage(eventTotalPages - 1);
  }, [eventTotalPages, eventPage]);

  // Recalls fetch
  useEffect(() => {
    void reloadKey;
    if (tab !== "recalls") return;
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    fetchRecalls({
      search: debounced,
      limit,
      skip: Math.min(page * limit, 25000),
      classification,
      status,
      state,
      dietary,
      signal: controller.signal,
    })
      .then(({ recalls: data, total: t, error: err, isStale: stale, isDemo: demo }) => {
        if (requestId !== requestIdRef.current) return;
        if (controller.signal.aborted) return;
        setRecalls(data);
        setTotal(t);
        setError(err);
        setIsStale(stale);
        setIsDemo(demo);
        setLastSynced(getLastSynced());
        setLoading(false);
        const newRecalls = data.filter((r) => !seenIdsRef.current.has(r.id));
        if (newRecalls.length > 0 && !firstLoadRef.current && !stale && !demo && !err) {
          const watched = newRecalls.filter(
            (r) =>
              matchesWatchlist(`${r.productDescription} ${r.reasonForRecall} ${r.recallingFirm}`, watchlistRef.current)
                .length > 0,
          );
          if (watched.length > 0 && notificationsEnabledRef.current) {
            sendNotification(
              `${watched.length} newly observed recall${watched.length > 1 ? "s" : ""} matching watchlist`,
              watched.map((r) => r.productDescription.slice(0, 80)).join("\n"),
            );
          }
        }
        data.forEach((r) => {
          seenIdsRef.current.add(r.id);
        });
        if (seenIdsRef.current.size > 1000) {
          const entries = [...seenIdsRef.current];
          seenIdsRef.current = new Set(entries.slice(entries.length - 1000));
        }
        firstLoadRef.current = false;
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setLoading(false);
      });
    return () => controller.abort();
  }, [tab, debounced, page, classification, status, state, dietary, reloadKey]);

  // Adverse events fetch
  useEffect(() => {
    void eventReloadKey;
    if (tab !== "events") return;
    const requestId = ++eventRequestIdRef.current;
    eventAbortRef.current?.abort();
    const controller = new AbortController();
    eventAbortRef.current = controller;
    setEventLoading(true);
    setEventError(null);
    fetchAdverseEvents({
      search: debounced,
      limit,
      skip: Math.min(eventPage * limit, 25000),
      signal: controller.signal,
    })
      .then(({ events: data, total: t, error: err, isStale: stale, isDemo: demo }) => {
        if (requestId !== eventRequestIdRef.current) return;
        if (controller.signal.aborted) return;
        setEvents(data);
        setEventTotal(t);
        setEventError(err);
        setEventIsStale(stale);
        setEventIsDemo(demo);
        setEventLastSynced(getEventLastSynced());
        setEventLoading(false);
        const newEvents = data.filter((e) => !eventSeenIdsRef.current.has(e.id));
        if (newEvents.length > 0 && !eventFirstLoadRef.current && !stale && !demo && !err) {
          const watched = newEvents.filter(
            (e) => matchesWatchlist(eventSearchText(e), watchlistRef.current).length > 0,
          );
          if (watched.length > 0 && notificationsEnabledRef.current) {
            sendNotification(
              `${watched.length} newly observed adverse event report${watched.length > 1 ? "s" : ""} matching watchlist`,
              watched.map((e) => (e.products[0]?.nameBrand || e.reportNumber).slice(0, 80)).join("\n"),
            );
          }
        }
        data.forEach((e) => {
          eventSeenIdsRef.current.add(e.id);
        });
        if (eventSeenIdsRef.current.size > 1000) {
          const entries = [...eventSeenIdsRef.current];
          eventSeenIdsRef.current = new Set(entries.slice(entries.length - 1000));
        }
        eventFirstLoadRef.current = false;
      })
      .catch(() => {
        if (requestId !== eventRequestIdRef.current) return;
        setEventLoading(false);
      });
    return () => controller.abort();
  }, [tab, debounced, eventPage, eventReloadKey]);

  const showDemo = tab === "recalls" ? isDemo : eventIsDemo;
  const showStale = tab === "recalls" ? isStale : eventIsStale;
  const showError = tab === "recalls" ? error : eventError;
  const showLastSynced = tab === "recalls" ? lastSynced : eventLastSynced;
  const onRetry = tab === "recalls" ? triggerReload : triggerEventReload;

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="site-header lg:sticky lg:top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div>
            <h1
              className="flex max-w-full flex-wrap items-center gap-3"
              aria-label="beanstalk FDA food recall explorer"
            >
              <span className="brand-name">
                <span className="sprouting-b">
                  b
                  <BeanstalkMark className="wordmark-leaves" />
                </span>
                eanstalk
              </span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {tab === "recalls" ? (
                <>
                  FDA enforcement records •{" "}
                  {showLastSynced
                    ? `Retrieved ${new Date(showLastSynced).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} today`
                    : "Retrieved — awaiting sync"}
                </>
              ) : (
                <>
                  FDA adverse event reports (CAERS) •{" "}
                  {showLastSynced
                    ? `Retrieved ${new Date(showLastSynced).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} today`
                    : "Retrieved — awaiting sync"}
                </>
              )}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {tab === "recalls"
                ? `${OPENFDA_AS_PUBLISHED} Food Enforcement archive (2004–present). Dataset typically refreshes mid-week (Wednesday publish lag).`
                : `${OPENFDA_AS_PUBLISHED} CAERS adverse event reports are unverified community/industry reports — not recalls.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="panel text-xs px-3 py-2 text-zinc-700 dark:text-zinc-300 max-w-sm">
              {tab === "recalls" ? (
                <>
                  <strong>FDA scope:</strong> {OPENFDA_AS_PUBLISHED} Status may remain Ongoing after a recall ends.
                  Verify with FDA before action.
                </>
              ) : (
                <>
                  <strong>Early signals:</strong> {FDA_EVENT_DISCLAIMER}
                </>
              )}
            </div>
            {!notificationsEnabled && getPermissionStatus() !== "denied" && (
              <button
                type="button"
                onClick={handleEnableNotifications}
                aria-label="Enable browser alert notifications for watchlist recalls"
                className="btn"
              >
                Enable Alerts
              </button>
            )}
            {notificationsEnabled && (
              <span
                className="px-3 py-2 text-sm text-green-700 dark:text-green-400 min-h-[44px] flex items-center"
                aria-label="Browser alert notifications are enabled"
                role="status"
              >
                🔔 Alerts on
              </span>
            )}
            <button
              type="button"
              onClick={toggleDark}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="btn btn-quiet px-3"
            >
              {dark ? "Light" : "Dark"} mode
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="panel inline-flex p-1" role="tablist" aria-label="Data source">
            <button
              type="button"
              role="tab"
              id="tab-recalls"
              aria-selected={tab === "recalls"}
              aria-controls="panel-recalls"
              onClick={() => setTab("recalls")}
              className={`px-4 py-2 text-sm rounded-md min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-amber-600 ${
                tab === "recalls"
                  ? "bg-paper dark:bg-zinc-700 font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Recalls
            </button>
            <button
              type="button"
              role="tab"
              id="tab-events"
              aria-selected={tab === "events"}
              aria-controls="panel-events"
              onClick={() => setTab("events")}
              className={`px-4 py-2 text-sm rounded-md min-h-[44px] focus:outline-hidden focus:ring-2 focus:ring-violet-600 ${
                tab === "events"
                  ? "bg-paper dark:bg-zinc-700 font-semibold text-violet-900 dark:text-violet-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Early Signals
            </button>
          </div>
        </div>
        {showDemo && (
          <div className="bg-purple-600 text-white text-center text-sm py-2" role="status">
            DEMO MODE — Fictional data, not real FDA {tab === "recalls" ? "recalls" : "adverse event reports"}. Add
            ?demo=1 to URL.
          </div>
        )}
        {showStale && (
          <div className="bg-amber-700 text-white text-center text-sm py-2" role="status">
            Stale cached data — live FDA request failed ({showError?.code}).{" "}
            <button type="button" onClick={onRetry} className="underline">
              Retry
            </button>{" "}
            <span>• Cached from {showLastSynced ? new Date(showLastSynced).toLocaleString() : "unknown"}</span>
          </div>
        )}
        {tab === "events" && (
          <div className="bg-violet-700 text-white text-center text-xs sm:text-sm py-2 px-3" role="note">
            Early Signals are unverified CAERS community reports — not confirmed recalls. {FDA_EVENT_DISCLAIMER}
          </div>
        )}
      </header>

      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        <div className="garden-intro">
          <div>
            <h2>A little clarity for your pantry.</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {tab === "recalls"
                ? "Search by product, state, or dietary concern."
                : "Search adverse event reports by product, reaction, or outcome."}
            </p>
          </div>
          <PantrySketch />
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 shrink-0">
            <div className="space-y-4 lg:sticky lg:top-4">
              <SearchBar value={query} onChange={setQuery} />
              {tab === "recalls" &&
                (() => {
                  const activeCount = [classification, status, state, ...dietary].filter(Boolean).length;
                  return (
                    <details className="group" open>
                      <summary className="panel lg:hidden flex items-center justify-between px-3 py-2 cursor-pointer list-none">
                        <span className="text-sm font-medium">Filters{activeCount ? ` (${activeCount})` : ""}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          tap to {activeCount ? "adjust" : "filter"}
                        </span>
                      </summary>
                      <div className="mt-3 lg:mt-0">
                        <FilterPanel
                          classification={classification}
                          status={status}
                          state={state}
                          dietary={dietary}
                          onClassification={setClassification}
                          onStatus={setStatus}
                          onState={setState}
                          onDietary={setDietary}
                          onClear={() => {
                            setClassification("");
                            setStatus("");
                            setState("");
                            setDietary([]);
                            setQuery("");
                          }}
                        />
                      </div>
                    </details>
                  );
                })()}
              {tab === "events" && (
                <div className="text-xs text-violet-900 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-lg p-3 space-y-2">
                  <p className="font-semibold">Early Signals filters</p>
                  <p>
                    Search product brand, reaction, or outcome. Classification, status, state, and dietary filters apply
                    to recalls only.
                  </p>
                  <p role="note">{FDA_EVENT_DISCLAIMER}</p>
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="underline text-violet-800 dark:text-violet-300 focus:outline-hidden focus:ring-2 focus:ring-violet-600 rounded min-h-[44px]"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
              <WatchlistPanel items={watchlist} onAdd={addToWatchlist} onRemove={removeFromWatchlist} />
              {tab === "recalls" ? (
                <div className="panel hint p-3 space-y-2">
                  <p className="font-semibold">Classification</p>
                  <p>
                    Class I = reasonable probability of serious adverse health consequences (21 CFR 7.3). Displayed per
                    FDA record.
                  </p>
                  <p className="font-semibold">Search notes</p>
                  <p>
                    No matches return openFDA 404 (shown as empty). Paging stops at skip 25,000;{" "}
                    <code className="text-[11px]">search_after</code> is not used. Related events match any product
                    token (parenthesized OR).
                  </p>
                </div>
              ) : (
                <div className="panel hint p-3">
                  <p className="font-semibold">Watchlist alerts</p>
                  <p>Watchlist terms also match adverse event product brands, reactions, and outcomes on this tab.</p>
                </div>
              )}
            </div>
          </aside>

          {tab === "recalls" && (
            <section
              id="panel-recalls"
              role="tabpanel"
              aria-labelledby="tab-recalls"
              className="flex-1 min-w-0"
              aria-live="polite"
              aria-busy={loading}
            >
              {loading && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3" role="status">
                  Loading…
                </p>
              )}
              {!loading && error && !isStale && recalls.length === 0 && (
                <div className="panel px-6 py-12 text-center">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50" role="alert">
                    Failed to load recalls: {error.message} ({error.code})
                  </p>
                  {error.retryable && (
                    <button type="button" onClick={triggerReload} className="btn btn-primary mt-4">
                      Retry
                    </button>
                  )}
                </div>
              )}
              {!loading && !error && recalls.length === 0 && (
                <div className="panel px-6 py-12 text-center" role="status">
                  <BeanstalkMark className="mx-auto mb-4 h-16 w-16 text-zinc-500 dark:text-zinc-400" />
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">No recalls match your filters.</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Try a shorter search or remove a filter. No results doesn’t mean a product is safe.
                  </p>
                </div>
              )}
              {!loading && !(error && !isStale && recalls.length === 0) && (
                <>
                  {recalls.length > 0 && (
                    <div className="flex items-center justify-end mb-3">
                      <label htmlFor="date-sort" className="text-xs font-medium dark:text-zinc-300 mr-2">
                        Sort by date
                      </label>
                      <select
                        id="date-sort"
                        value={dateSort}
                        onChange={(e) => setDateSort(e.target.value === "oldest" ? "oldest" : "newest")}
                        className="input w-auto"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortRecallsByDate(recalls, dateSort).map((r) => (
                      <RecallCard
                        key={r.id}
                        recall={r}
                        onSelect={setSelected}
                        isNew={isNewRecall(r.recallInitiationDate)}
                        watchlist={watchlist}
                        dietary={dietary}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="btn"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
                      Page {page + 1} / {totalPages} •{" "}
                      {hasTruncatedWindow ? `${reachableTotal} of ${total} reachable` : `${total} results`}{" "}
                      {isStale ? "(stale)" : ""}
                    </span>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                  {hasTruncatedWindow && (
                    <p className="hint text-center mt-2">
                      Showing the first {reachableTotal.toLocaleString()} of {total.toLocaleString()}. FDA&apos;s offset
                      limit of {FDA_MAX_SKIP.toLocaleString()} stops paging after page {maxPage + 1}; narrow the filters
                      to see more.
                    </p>
                  )}
                  <p className="hint text-center mt-2">
                    Sorted by date, {dateSort === "newest" ? "newest" : "oldest"} first. Dates shown are
                    recall_initiation_date or report_date from FDA.
                  </p>
                </>
              )}
            </section>
          )}

          {tab === "events" && (
            <section
              id="panel-events"
              role="tabpanel"
              aria-labelledby="tab-events"
              className="flex-1 min-w-0"
              aria-live="polite"
              aria-busy={eventLoading}
            >
              <div
                className="mb-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-3 text-xs text-violet-900 dark:text-violet-200"
                role="note"
              >
                <strong>Community reports / early signals</strong> — these are not recalls. {FDA_EVENT_DISCLAIMER}
              </div>
              {eventLoading && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3" role="status">
                  Loading…
                </p>
              )}
              {!eventLoading && eventError && !eventIsStale && events.length === 0 && (
                <div className="panel px-6 py-12 text-center">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50" role="alert">
                    Failed to load adverse event reports: {eventError.message} ({eventError.code})
                  </p>
                  {eventError.retryable && (
                    <button type="button" onClick={triggerEventReload} className="btn btn-primary mt-4">
                      Retry
                    </button>
                  )}
                </div>
              )}
              {!eventLoading && !eventError && events.length === 0 && (
                <div className="panel px-6 py-12 text-center" role="status">
                  <BeanstalkMark className="mx-auto mb-4 h-16 w-16 text-zinc-500 dark:text-zinc-400" />
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    No adverse event reports match your search.
                  </p>
                </div>
              )}
              {!eventLoading && !(eventError && !eventIsStale && events.length === 0) && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        onSelect={setSelectedEvent}
                        isNew={isNewRecall(e.dateStarted)}
                        watchlist={watchlist}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <button
                      type="button"
                      disabled={eventPage === 0}
                      onClick={() => setEventPage((p) => Math.max(0, p - 1))}
                      className="btn"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
                      Page {eventPage + 1} / {eventTotalPages} •{" "}
                      {eventHasTruncatedWindow
                        ? `${eventReachableTotal} of ${eventTotal} reachable`
                        : `${eventTotal} results`}{" "}
                      {eventIsStale ? "(stale)" : ""}
                    </span>
                    <button
                      type="button"
                      disabled={eventPage + 1 >= eventTotalPages}
                      onClick={() => setEventPage((p) => p + 1)}
                      className="btn"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                  {eventHasTruncatedWindow && (
                    <p className="hint text-center mt-2">
                      Showing the first {eventReachableTotal.toLocaleString()} of {eventTotal.toLocaleString()}.
                      FDA&apos;s offset limit of {FDA_MAX_SKIP.toLocaleString()} stops paging after page {maxPage + 1}.
                      Narrow the search to see more.
                    </p>
                  )}
                  <p className="hint text-center mt-2">
                    Sorted by date_started, newest first. Unverified CAERS reports only.
                  </p>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      {selected && (
        <RecallDetail
          recall={selected}
          onClose={() => setSelected(null)}
          onSelectEvent={(event) => {
            setSelected(null);
            setSelectedEvent(event);
            setTab("events");
          }}
        />
      )}
      {selectedEvent && <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

      <footer className="site-footer border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 text-sm text-zinc-600 sm:px-6 dark:text-zinc-400">
          <p>
            Data:{" "}
            <a
              className="underline underline-offset-2"
              href="https://open.fda.gov/apis/food/enforcement/"
              target="_blank"
              rel="noopener noreferrer"
            >
              openFDA Food Enforcement
            </a>
            {" · "}
            <a
              className="underline underline-offset-2"
              href="https://open.fda.gov/apis/food/event/"
              target="_blank"
              rel="noopener noreferrer"
            >
              openFDA Food Adverse Events
            </a>
            {" · "}
            {OPENFDA_AS_PUBLISHED} Early Signals are unverified community reports, not recalls. Verify with FDA before
            action. • Not medical advice.
          </p>
          <p>
            Beanstalk is free, built by JACOBRAKAI FOUNDATION, a 501(c)(3) public charity (EIN 33-3382083).{" "}
            <a
              className="underline underline-offset-2"
              href="https://donate.stripe.com/eVq4gy97DanS9h60phfrW00"
              target="_blank"
              rel="noopener noreferrer"
              title="Donate to JACOBRAKAI FOUNDATION, a 501(c)(3) public charity"
              data-testid="donate-link"
            >
              Donate
            </a>
            {" · "}
            <a
              className="underline underline-offset-2"
              href="https://jacobrakai.org/donate/"
              target="_blank"
              rel="noopener noreferrer"
            >
              How gifts are used
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
