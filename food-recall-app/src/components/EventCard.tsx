import { eventSearchText } from "../lib/events";
import { formatRecallDate } from "../lib/formatDate";
import { matchesWatchlist } from "../lib/watchlist";
import type { AdverseEvent } from "../types/event";
import { FDA_EVENT_DISCLAIMER } from "../types/event";

interface Props {
  event: AdverseEvent;
  onSelect: (e: AdverseEvent) => void;
  isNew: boolean;
  watchlist: string[];
}

export default function EventCard({ event, onSelect, isNew, watchlist }: Props) {
  const brandNames =
    event.products
      .map((p) => p.nameBrand)
      .filter(Boolean)
      .join(", ") || "Unknown product";
  const matchedTerms = matchesWatchlist(eventSearchText(event), watchlist);
  const isWatched = matchedTerms.length > 0;
  const topReactions = event.reactions.slice(0, 3);
  const topOutcomes = event.outcomes.slice(0, 2);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(event);
        }
      }}
      aria-label={`View adverse event report ${event.reportNumber}: ${brandNames}`}
      className={`panel recall-card cursor-pointer p-4 sm:p-5 flex flex-col gap-2 focus:outline-hidden focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 ${
        isNew ? "border-violet-400 dark:border-violet-600 ring-1 ring-violet-200 dark:ring-violet-800" : ""
      }`}
    >
      <div className="flex gap-1.5 flex-wrap">
        <span className="chip bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-800">
          Early signal
        </span>
        <span className="chip chip-neutral">Unverified</span>
        {event.consumer.gender && <span className="chip chip-neutral">{event.consumer.gender}</span>}
        {isNew && <span className="chip chip-info">NEW</span>}
        {isWatched && <span className="chip chip-personal">Watching</span>}
      </div>
      <h3 className="font-semibold text-sm leading-tight line-clamp-2 dark:text-zinc-100">{brandNames}</h3>
      {topReactions.length > 0 && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
          Reactions: {topReactions.join(", ")}
          {event.reactions.length > 3 ? "…" : ""}
        </p>
      )}
      {topOutcomes.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Outcomes: {topOutcomes.join(", ")}
          {event.outcomes.length > 2 ? "…" : ""}
        </p>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Report {event.reportNumber || "—"} • {formatRecallDate(event.dateStarted)}
      </p>
      {isWatched && matchedTerms.length > 0 && (
        <p className="text-xs text-indigo-800 dark:text-indigo-300">Watch: {matchedTerms.join(", ")}</p>
      )}
      <p className="text-[10px] leading-snug text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 rounded px-2 py-1">
        {FDA_EVENT_DISCLAIMER}
      </p>
    </article>
  );
}
