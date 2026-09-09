interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div>
      <label htmlFor="search-input" className="text-sm font-medium dark:text-zinc-300">
        Search
      </label>
      <input
        id="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Product, reason, firm, reaction…"
        className="mt-1 w-full border-zinc-400 dark:border-zinc-500 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
      />
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
        No matches → empty (openFDA 404). Records as published by openFDA, not a live FDA lifecycle.
      </p>
    </div>
  );
}
