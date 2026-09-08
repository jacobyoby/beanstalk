import type { Recall } from '../types/recall'
function badge(c:string){
  if(c==='Class I') return 'bg-red-600 text-white'
  if(c==='Class II') return 'bg-amber-500 text-white'
  return 'bg-zinc-600 text-white'
}
export default function RecallCard({recall,onSelect}:{recall:Recall;onSelect:(r:Recall)=>void}){
  return (
    <article onClick={()=>onSelect(recall)} className="bg-white border rounded-xl p-4 hover:shadow-md cursor-pointer transition flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full ${badge(recall.classification)}`}>{recall.classification}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 border">{recall.status}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 border">{recall.state || recall.city}</span>
      </div>
      <h3 className="font-semibold text-sm leading-tight line-clamp-2">{recall.productDescription}</h3>
      <p className="text-xs text-zinc-600 line-clamp-2">{recall.reasonForRecall}</p>
      <p className="text-xs text-zinc-500">{recall.recallingFirm} • {recall.recallInitiationDate}</p>
      <p className="text-xs text-zinc-500 truncate">Dist: {recall.distributionPattern}</p>
    </article>
  )
}
