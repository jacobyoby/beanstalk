interface Props {
  value: string
  onChange: (v: string) => void
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div>
      <label htmlFor="search-input" className="text-sm font-medium dark:text-zinc-300">Search</label>
      <input
        id="search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Product, reason, firm…"
        className="mt-1 w-full border-zinc-400 dark:border-zinc-500 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
      />
    </div>
  )
}
