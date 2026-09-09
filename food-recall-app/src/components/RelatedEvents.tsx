import { useEffect, useState } from "react";
import { fetchRelatedEvents } from "../lib/events";
import { formatRecallDate } from "../lib/formatDate";
import type { AdverseEvent } from "../types/event";
import { FDA_EVENT_DISCLAIMER } from "../types/event";

interface Props {
  productDescription: string;
  onSelectEvent: (event: AdverseEvent) => void;
}

export default function RelatedEvents({ productDescription, onSelectEvent }: Props) {
  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchRelatedEvents(productDescription, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setEvents(res.events);
        setError(res.error && res.events.length === 0 ? res.error.message : null);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError("Could not load related events");
      });
    return () => controller.abort();
  }, [productDescription]);

  return (
    <div className="mt-6 border-t dark:border-zinc-700 pt-4">
      <h3 className="text-sm font-semibold dark:text-zinc-100">Related adverse event reports</h3>
      <p className="text-[11px] text-violet-800 dark:text-violet-300 mt-1 mb-3" role="note">
        Matches any product token (parenthesized OR), as published by openFDA CAERS — not live FDA lifecycle. No matches
        return openFDA 404 (shown as none found). {FDA_EVENT_DISCLAIMER}
      </p>
      {loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" role="status">
          Looking for related early signals…
        </p>
      )}
      {!loading && error && <p className="text-xs text-zinc-500 dark:text-zinc-400">{error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No matching CAERS reports found for this product text.
        </p>
      )}
      {!loading && events.length > 0 && (
        <ul className="space-y-2">
          {events.map((ev) => {
            const brand =
              ev.products
                .map((p) => p.nameBrand)
                .filter(Boolean)
                .join(", ") || "Unknown product";
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className="w-full text-left border dark:border-zinc-600 rounded-lg p-2 text-xs hover:bg-violet-50 dark:hover:bg-violet-950/40 focus:outline-none focus:ring-2 focus:ring-violet-600 dark:text-zinc-200"
                >
                  <span className="font-medium line-clamp-1">{brand}</span>
                  <span className="block text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {ev.reactions.slice(0, 2).join(", ") || "No reactions listed"} · {formatRecallDate(ev.dateStarted)}
                  </span>
                  <span className="block text-violet-700 dark:text-violet-400 mt-0.5">Unverified community report</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
