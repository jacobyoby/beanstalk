export default function SearchBar({value,onChange}:{value:string;onChange:(v:string)=>void}){
  return (
    <div>
      <label className="text-sm font-medium">Search</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Product, reason, firm…" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
    </div>
  )
}
