import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, BadgeColor } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { collections, getCollectionsForSource, getSourceById, getTagsForSource, getTopicsForSource, isFullyReadable, slugify, tags, SourceQuality } from '../data/sources'
import { AlertTriangle, ArrowLeft, Check, ChevronRight, ExternalLink, Folder, Maximize2, MessageSquare, Plus, Search, Sparkles, Tag, X } from 'lucide-react'

type Tab = 'original' | 'digest' | 'ask' | 'related' | 'details'
type Sheet = 'tag' | 'collection' | null

const detailTabs: { id: Tab; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'digest', label: 'Digest' },
  { id: 'ask', label: 'Ask' },
  { id: 'related', label: 'Related' },
  { id: 'details', label: 'Details' },
]

function qualityColor(quality: SourceQuality): BadgeColor {
  if (quality === 'Full text') return 'teal'
  if (quality === 'Transcript') return 'cyan'
  if (quality === 'Preview only') return 'amber'
  if (quality === 'Metadata only') return 'coral'
  if (quality === 'Needs upgrade') return 'ruby'
  return 'slate'
}

export function MobileItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const source = getSourceById(id || '')
  const [tab, setTab] = useState<Tab>('original')
  const [focus, setFocus] = useState(false)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [tagInput, setTagInput] = useState('research methods')
  const [notice, setNotice] = useState<string | null>(null)
  if (!source) return <div className="p-4 text-slate-500">Item not found</div>

  const itemTags = getTagsForSource(source)
  const itemTopics = getTopicsForSource(source)
  const itemCollections = getCollectionsForSource(source)
  const duplicateTag = tags.some((tag) => tag.slug === slugify(tagInput))

  if (focus) {
    return <div className="flex flex-col h-full bg-white"><div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Focus mode</p><h1 className="text-[15px] font-bold text-slate-900 line-clamp-1">{source.title}</h1></div><button onClick={() => setFocus(false)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><X size={18} /></button></div><div className="flex-1 overflow-auto p-5"><div className="flex gap-2 flex-wrap mb-5"><Badge color={qualityColor(source.quality)} variant="subtle">{source.quality}</Badge><span className="text-[12px] text-slate-500">{source.sourceType} / {source.capturedVia}</span></div>{source.needsUpgradeReason && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900"><b>Readable text is limited.</b> Add full text before relying on scoped Ask.</div>}<h2 className="text-[24px] font-bold text-slate-900 leading-tight mb-4">Introduction to the saved source</h2><p className="text-[17px] leading-8 text-slate-800 mb-5">{source.snippet}</p><p className="text-[17px] leading-8 text-slate-800 mb-5">Focus mode keeps the source in front and hides Tags, Included topics, Collections, and bottom navigation while reading.</p><h2 className="text-[22px] font-bold text-slate-900 mt-8 mb-4">Source-grounded reading</h2><p className="text-[17px] leading-8 text-slate-800">Return to details to explore the item by tag, topic, collection, or scoped Ask.</p></div></div>
  }

  return <div className="flex flex-col h-full bg-slate-50 relative">
    {notice && <div className="absolute top-3 left-4 right-4 z-40 rounded-xl bg-slate-900 text-white px-4 py-3 text-[13px] flex items-center justify-between"><span>{notice}</span><button onClick={() => setNotice(null)}><X size={14} /></button></div>}
    <div className="flex-1 overflow-auto pb-20">
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 sticky top-0 z-10"><button onClick={() => navigate('/library')} className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500"><ArrowLeft size={17} /> Library</button><div className="flex items-start justify-between gap-3"><div><div className="flex gap-2 flex-wrap mb-2"><Badge color={qualityColor(source.quality)} variant="subtle">{source.quality}</Badge><span className="text-[12px] text-slate-500">Via {source.capturedVia}</span></div><h1 className="text-[22px] font-bold text-slate-900 leading-tight">{source.title}</h1></div><button onClick={() => setFocus(true)} className="w-10 h-10 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center"><Maximize2 size={18} /></button></div></div>
      <div className="grid grid-cols-5 border-b border-slate-200 bg-white">
        {detailTabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`min-w-0 px-1 py-3 text-center text-[12px] font-bold border-b-2 ${tab === item.id ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500'}`}><span className="block truncate">{item.label}</span></button>)}
      </div>
      <div className="p-4 space-y-4">
        {tab === 'original' && <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-[18px] font-bold text-slate-900">Readable content</h2><button onClick={() => setFocus(true)} className="text-blue-700"><Maximize2 size={18} /></button></div>{source.needsUpgradeReason && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900"><b>{source.needsUpgradeReason}</b>. Topics and Ask may be limited until full text is added.</div>}<p className="text-[16px] leading-7 text-slate-800">{source.snippet}</p><p className="mt-4 text-[16px] leading-7 text-slate-800">This prototype body demonstrates the source-first reading surface.</p></section>}
        {tab === 'digest' && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-[18px] font-bold text-slate-900 mb-3 flex items-center gap-2"><Sparkles size={18} className="text-violet-500" /> AI Digest</h2><ul className="space-y-2 text-[14px] leading-6 text-slate-700 list-disc pl-5"><li>Source quality remains visible before AI interpretation.</li><li>Tags are editable, topics are detected, and collections are user-managed.</li><li>Scoped Ask warns when sources are limited.</li></ul></section>}
        {tab === 'ask' && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-[18px] font-bold text-slate-900 mb-2">Ask this item</h2><p className="text-[13px] text-slate-500 mb-4">Scope: this saved item only.</p><button onClick={() => navigate(`/ask?scope=selected&items=${source.id}`)} className="w-full rounded-xl bg-slate-900 py-3 text-white font-bold flex items-center justify-center gap-2"><MessageSquare size={16} /> Open scoped Ask</button></section>}
        {tab === 'related' && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-[18px] font-bold text-slate-900 mb-2">Related</h2><p className="text-[13px] text-slate-500">Related items will appear from shared tags, topics, and collections.</p></section>}
        {tab === 'details' && <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-[16px] font-bold text-slate-900 mb-3">Source and capture</h2><div className="space-y-2 text-[14px]"><div className="flex justify-between"><span className="text-slate-500">Original source</span><b>{source.sourceType}</b></div><div className="flex justify-between"><span className="text-slate-500">Captured via</span><b>{source.capturedVia}</b></div><div className="flex justify-between"><span className="text-slate-500">Offline</span><b>{source.offlineAvailable ? 'Available' : 'Not saved'}</b></div></div></section>
          <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><h2 className="text-[16px] font-bold text-slate-900">Tags</h2><p className="text-[12px] text-slate-500">Editable labels for finding saved items.</p></div><button onClick={() => setSheet('tag')} className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-bold">Add</button></div><div className="mt-3 flex flex-wrap gap-2">{itemTags.length === 0 && <p className="text-[13px] text-slate-500">No tags yet.</p>}{itemTags.map((tag) => <button key={tag.id} onClick={() => navigate(`/library?tag=${tag.slug}&from=item:${source.id}`)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-semibold text-slate-800"><span className="mr-1 text-[10px] uppercase text-violet-600">{tag.provenance.includes('Brain') ? 'Suggested' : 'You'}</span>{tag.label}</button>)}</div></section>
          <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><h2 className="text-[16px] font-bold text-slate-900">Included topics</h2><p className="text-[12px] text-slate-500">Detected in this item.</p></div><Badge color="azure" variant="subtle">Detected</Badge></div>{!isFullyReadable(source) && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">Topic results depend on readable saved content.</div>}<div className="mt-3 flex flex-wrap gap-2">{itemTopics.length === 0 && <p className="text-[13px] text-slate-500">Topics appear after Brain can read the content.</p>}{itemTopics.map((topic) => <button key={topic.id} onClick={() => navigate(`/topic/${topic.slug}?from=item:${source.id}`)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-800">{topic.label}</button>)}</div></section>
          <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><h2 className="text-[16px] font-bold text-slate-900">Collections</h2><p className="text-[12px] text-slate-500">Saved spaces you manage.</p></div><button onClick={() => setSheet('collection')} className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-bold">Add</button></div><div className="mt-3 space-y-2">{itemCollections.length === 0 && <p className="text-[13px] text-slate-500">Not in a collection yet.</p>}{itemCollections.map((collection) => <button key={collection.id} onClick={() => navigate(`/collection/${collection.slug}?from=item:${source.id}`)} className="w-full rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3 text-left text-[14px] font-bold text-fuchsia-800 flex items-center justify-between"><span className="flex items-center gap-2"><Folder size={15} /> {collection.label}</span><ChevronRight size={16} /></button>)}</div></section>
        </div>}
      </div>
    </div>
    <MobileBottomNav />
    {sheet === 'tag' && <div className="absolute inset-0 z-50 bg-black/20 flex items-end"><div className="w-full rounded-t-3xl bg-white p-5 max-h-[78%] overflow-auto"><div className="flex items-center justify-between mb-4"><h2 className="text-[20px] font-bold text-slate-900">Add tag</h2><button onClick={() => setSheet(null)}><X size={20} /></button></div><div className="relative mb-3"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="w-full rounded-xl bg-slate-100 py-3 pl-10 pr-3 text-[15px] outline-none" /></div>{duplicateTag && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">Already exists. Add existing tag instead?</div>}<p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-400">Attached tags</p>{itemTags.map((tag) => <div key={tag.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 p-3"><span className="font-medium text-slate-900">{tag.label}</span><button onClick={() => setNotice(`Removed ${tag.label} from this item. Undo`)} className="text-[12px] font-bold text-rose-600">Remove</button></div>)}<button onClick={() => { setNotice(duplicateTag ? `Added existing tag ${tagInput}.` : `Created ${tagInput} and added it.`); setSheet(null) }} className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-white font-bold">Done</button></div></div>}
    {sheet === 'collection' && <div className="absolute inset-0 z-50 bg-black/20 flex items-end"><div className="w-full rounded-t-3xl bg-white p-5 max-h-[78%] overflow-auto"><div className="flex items-center justify-between mb-4"><h2 className="text-[20px] font-bold text-slate-900">Add to collection</h2><button onClick={() => setSheet(null)}><X size={20} /></button></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-500 mb-3">Reconnect to update collections when offline.</div>{collections.map((collection) => <label key={collection.id} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" defaultChecked={source.collectionIds.includes(collection.id)} /><span className="font-medium text-slate-900">{collection.label}</span></label>)}<button onClick={() => { setNotice('Collection updates applied. Undo'); setSheet(null) }} className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-white font-bold">Apply</button></div></div>}
  </div>
}
