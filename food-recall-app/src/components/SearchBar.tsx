interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div>
      <label htmlFor="search-input" className="label mb-1">
        Search
      </label>
      <div className="search-shell relative">
        <svg
          className="search-icon pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" strokeLinecap="round" />
        </svg>
        <input
          id="search-input"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Product, reason, firm, reaction…"
          autoComplete="off"
          className="input pl-9"
        />
      </div>
      <p className="hint mt-1">
        No matches → empty (openFDA 404). Records as published by openFDA, not a live FDA lifecycle.
      </p>
    </div>
  );
}
