import { type DietaryConcern, getDietaryMatches } from "../lib/dietary";
import { formatRecallDate } from "../lib/formatDate";
import { matchesWatchlist } from "../lib/watchlist";
import type { Recall } from "../types/recall";

interface Props {
  recall: Recall;
  onSelect: (r: Recall) => void;
  isNew: boolean;
  watchlist: string[];
  dietary?: DietaryConcern[];
}

function badge(c: string) {
  if (c === "Class I") return "chip bg-red-700 text-white ring-red-700";
  if (c === "Class II") return "chip chip-info";
  return "chip chip-neutral";
}

export default function RecallCard({ recall, onSelect, isNew, watchlist, dietary = [] }: Props) {
  const matchedTerms = matchesWatchlist(
    `${recall.productDescription} ${recall.reasonForRecall} ${recall.recallingFirm}`,
    watchlist,
  );
  const isWatched = matchedTerms.length > 0;
  const dietaryMatches = dietary.length > 0 ? getDietaryMatches(recall, dietary) : [];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(recall)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(recall);
        }
      }}
      aria-label={`View recall ${recall.recallNumber}: ${recall.productDescription}`}
      className={`panel recall-card cursor-pointer p-4 sm:p-5 flex flex-col gap-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
        isNew ? "border-sky-400 dark:border-sky-600 ring-1 ring-sky-200 dark:ring-sky-800" : ""
      }`}
    >
      <div className="flex gap-1.5 flex-wrap">
        <span className={badge(recall.classification)}>{recall.classification}</span>
        <span className={recall.status.toLowerCase() === "ongoing" ? "chip chip-info" : "chip chip-neutral"}>
          {recall.status}
        </span>
        {recall.state && <span className="chip chip-neutral">{recall.state}</span>}
        {isNew && <span className="chip chip-info">NEW</span>}
        {isWatched && <span className="chip chip-personal">Watching</span>}
      </div>
      <h3 className="font-semibold text-sm leading-tight line-clamp-2 dark:text-zinc-100">
        {recall.productDescription}
      </h3>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{recall.reasonForRecall}</p>
      <p className="recall-card-facts text-xs text-zinc-500 dark:text-zinc-400">
        {recall.recallingFirm} • {formatRecallDate(recall.recallInitiationDate)}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Dist: {recall.distributionPattern}</p>
      {isWatched && matchedTerms.length > 0 && (
        <p className="text-xs text-indigo-800 dark:text-indigo-300">Watch: {matchedTerms.join(", ")}</p>
      )}
      {dietaryMatches.length > 0 && (
        <p className="text-xs text-emerald-800 dark:text-emerald-300">
          Dietary: {dietaryMatches.map((m) => `${m.concern} via ${m.field} (“${m.term}”)`).join(", ")}
        </p>
      )}
      {dietary.length > 0 && dietaryMatches.length === 0 && (
        <p className="hint">No dietary match — absence does not mean allergen-free</p>
      )}
    </article>
  );
}
