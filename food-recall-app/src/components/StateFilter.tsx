const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
]

interface Props {
  selected: string
  onChange: (state: string) => void
}

export default function StateFilter({ selected, onChange }: Props) {
  return (
    <div>
      <label className="text-xs font-medium dark:text-zinc-300">Distribution State</label>
      <select
        value={selected}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border dark:border-zinc-600 rounded-lg px-2 py-2 text-sm bg-white dark:bg-zinc-700 dark:text-zinc-100"
      >
        <option value="">All states</option>
        <option value="Nationwide">Nationwide</option>
        {US_STATES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <p className="text-xs text-zinc-500 mt-1">Matches reported distribution_pattern (bounded, not firm location). Nationwide is potentially relevant to any state; source text preserved.</p>
      <p className="text-xs text-zinc-500">Unclear/region-only shown as “unclear” — initial distribution may omit downstream coverage.</p>
    </div>
  )
}
