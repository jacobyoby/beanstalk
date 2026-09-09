interface Props {
  value: string
  onChange: (v: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div>
      <label htmlFor="search-input" className="label mb-1">Search</label>
      <div className="search-shell relative">
        <svg className="search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" strokeLinecap="round" />
        </svg>
        <input
          id="search-input"
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Product, reason, or firm"
          autoComplete="off"
          className="input pl-9 pr-12"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
