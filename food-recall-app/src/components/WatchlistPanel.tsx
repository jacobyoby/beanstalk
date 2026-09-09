import { useState } from "react";

interface Props {
  items: string[];
  onAdd: (term: string) => void;
  onRemove: (term: string) => void;
}

export default function WatchlistPanel({ items, onAdd, onRemove }: Props) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = input.trim();
    if (term) {
      onAdd(term);
      setInput("");
    }
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Watchlist</h2>
        <span className="hint">
          {items.length} term{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor="watchlist-input" className="sr-only">
            Watchlist keyword
          </label>
          <input
            id="watchlist-input"
            aria-label="Watchlist keyword"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Brand, keyword, allergen…"
            autoComplete="off"
            className="input"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Add
          </button>
        </form>

        {items.length === 0 && (
          <p className="hint">Add keywords to get alerts when matching recalls or adverse event reports appear.</p>
        )}

        {items.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Watchlist terms">
            {items.map((term) => (
              <li key={term} className="chip chip-personal pr-0.5">
                {term}
                <button
                  type="button"
                  onClick={() => onRemove(term)}
                  className="ml-0.5 flex h-6 w-6 items-center justify-center rounded text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 dark:text-indigo-300 dark:hover:bg-indigo-900"
                  aria-label={`Remove ${term}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
