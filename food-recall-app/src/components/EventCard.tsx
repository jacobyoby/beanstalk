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
      className={`bg-white dark:bg-zinc-800 border rounded-xl p-4 hover:shadow-md cursor-pointer transition flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2 ${
        isNew
          ? "border-violet-400 dark:border-violet-500 ring-1 ring-violet-200 dark:ring-violet-800"
          : "dark:border-zinc-700"
      }`}
    >
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs px-2 py-1 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-700 font-medium">
          Early signal
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 border dark:border-zinc-600">
          Unverified
        </span>
        {event.consumer.gender && (
          <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-200 border dark:border-zinc-600">
            {event.consumer.gender}
          </span>
        )}
        {isNew && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 font-medium">
            NEW
          </span>
        )}
        {isWatched && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 font-medium">
            Watching
          </span>
        )}
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
        <p className="text-xs text-amber-700 dark:text-amber-400">Watch: {matchedTerms.join(", ")}</p>
      )}
      <p className="text-[10px] leading-snug text-violet-800 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 rounded px-2 py-1">
        {FDA_EVENT_DISCLAIMER}
      </p>
    </article>
  );
}
