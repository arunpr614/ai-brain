import React, { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { getCollectionBySlug, getSourcesByCollection, sources } from '../data/sources'
import { ArrowLeft, Folder, MessageSquare, Plus, Search, X } from 'lucide-react'

export function MobileCollection() {
  const { collectionSlug = '' } = useParams<{ collectionSlug: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const collection = getCollectionBySlug(collectionSlug)
  const [sheet, setSheet] = useState(false)
  if (!collection) return <div className="p-4 text-slate-500">Collection not found</div>
  const items = getSourcesByCollection(collection.id)
  const from = params.get('from') || ''
  const goBack = () => from.startsWith('item:') ? navigate(`/item/${from.replace('item:', '')}`) : navigate('/library')
  return <div className="flex flex-col h-full bg-slate-50 relative"><div className="flex-1 overflow-auto pb-20"><div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10"><button onClick={goBack} className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500"><ArrowLeft size={17} /> Back</button><Badge color="magenta" variant="subtle">Created by you</Badge><h1 className="mt-2 text-[24px] font-bold text-slate-900 leading-tight flex items-center gap-2"><Folder size={22} /> {collection.label}</h1><p className="mt-1 text-[13px] text-slate-500">{collection.description}</p><div className="mt-4 flex gap-2"><button onClick={() => navigate(`/ask?scope=collection&collection=${collection.slug}`)} className="flex-1 rounded-xl bg-violet-600 py-3 text-white font-bold flex items-center justify-center gap-2"><MessageSquare size={16} /> Ask</button><button onClick={() => setSheet(true)} className="rounded-xl border border-slate-200 bg-white px-4 text-slate-900 font-bold"><Plus size={18} /></button></div></div><div className="p-4 space-y-3"><div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search collection" className="w-full rounded-xl bg-white border border-slate-200 py-3 pl-10 pr-3 outline-none" /></div>{items.length === 0 && <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-500">No items in this collection yet.</div>}{items.map((item) => <button key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left"><p className="text-[15px] font-bold text-slate-900 line-clamp-2">{item.title}</p><p className="mt-1 text-[12px] text-slate-500">{item.quality} / {item.sourceType}</p></button>)}</div></div><MobileBottomNav />{sheet && <div className="absolute inset-0 z-50 bg-black/20 flex items-end"><div className="w-full rounded-t-3xl bg-white p-5 max-h-[78%] overflow-auto"><div className="flex justify-between mb-4"><h2 className="text-[20px] font-bold text-slate-900">Add items</h2><button onClick={() => setSheet(false)}><X size={20} /></button></div>{sources.map((item) => <label key={item.id} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" defaultChecked={collection.itemIds.includes(item.id)} /><span className="text-[13px] font-medium text-slate-900">{item.title}</span></label>)}<button onClick={() => setSheet(false)} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-white font-bold">Apply</button></div></div>}</div>
}
