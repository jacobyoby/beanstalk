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
      <label htmlFor="state-select" className="label mb-1">Sold in state</label>
      <select
        id="state-select"
        value={selected}
        onChange={e => onChange(e.target.value)}
        className="input"
      >
        <option value="">Any state</option>
        <option value="Nationwide">Nationwide</option>
        {US_STATES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <details className="hint mt-1">
        <summary className="min-h-[44px] cursor-pointer select-none py-3">How state matching works</summary>
        <p className="mt-1">Matches reported distribution, not the firm's location. Nationwide records can match any state.</p>
        <p>State filters can miss records with unclear or incomplete distribution. Read the full source text in each record.</p>
      </details>
    </div>
  )
}
