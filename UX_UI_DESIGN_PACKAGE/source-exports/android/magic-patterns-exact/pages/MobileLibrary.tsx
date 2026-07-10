import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, BadgeColor } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Circle, MoreVertical, Search, SlidersHorizontal, WifiOff, X } from 'lucide-react'
import { countLimitedSources, getSourcesByTag, getTagBySlug, sources, SourceQuality } from '../data/sources'

type Filter = 'All' | 'Needs Upgrade' | 'Offline' | 'Full text' | 'YouTube' | 'LinkedIn' | 'Substack' | 'PDF' | 'Notes'
const primaryFilters: Filter[] = ['All', 'Needs Upgrade', 'Offline', 'Full text']
const sourceFilters: Filter[] = ['YouTube', 'LinkedIn', 'Substack', 'PDF', 'Notes']

function qualityColor(quality: SourceQuality): BadgeColor {
  if (quality === 'Full text') return 'teal'
  if (quality === 'Transcript') return 'cyan'
  if (quality === 'Preview only') return 'amber'
  if (quality === 'Metadata only') return 'coral'
  if (quality === 'Needs upgrade') return 'ruby'
  return 'slate'
}

export function MobileLibrary() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tagSlug = params.get('tag') || ''
  const from = params.get('from') || ''
  const activeTag = tagSlug ? getTagBySlug(tagSlug) : undefined
  const [filter, setFilter] = useState<Filter>('All')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const baseItems = activeTag ? getSourcesByTag(activeTag.slug) : sources
  const weakCount = sources.filter((s) => s.needsUpgradeReason).length
  const limitedCount = countLimitedSources(baseItems)
  const filtered = baseItems.filter((s) => {
    if (filter === 'Needs Upgrade') return !!s.needsUpgradeReason
    if (filter === 'Offline') return s.offlineAvailable
    if (filter === 'Full text') return s.quality === 'Full text' || s.quality === 'Transcript'
    if (filter === 'Notes') return s.sourceType === 'Manual note'
    if (['YouTube', 'LinkedIn', 'Substack', 'PDF'].includes(filter)) return s.sourceType === filter
    return true
  })

  const applyFilter = (next: Filter, closeSheet = false) => {
    setFilter(next)
    if (closeSheet) setFilterSheetOpen(false)
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
    if (next.size === 0) setIsSelectMode(false)
  }

  const openItem = (id: string) => {
    if (isSelectMode) toggleSelect(id)
    else navigate(`/item/${id}`)
  }

  const filterButtonClass = (option: Filter, tone: 'slate' | 'violet' = 'slate') => {
    const active = filter === option
    if (active && tone === 'violet') return 'border-violet-600 bg-violet-600 text-white'
    if (active) return 'border-slate-900 bg-slate-900 text-white'
    return 'border-slate-200 bg-white text-slate-700'
  }

  return (
    <div className="flex flex-col h-full relative bg-slate-50">
      {isSelectMode && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-violet-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
          <button onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()) }} className="text-sm font-medium">Cancel</button>
          <span className="text-sm font-bold">{selectedIds.size} selected</span>
          <button className="text-sm font-medium" onClick={() => navigate(`/ask?scope=selected&items=${Array.from(selectedIds).join(',')}`)}>Ask</button>
        </div>
      )}
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white border-b border-slate-200 p-4 pt-5 sticky top-0 z-10">
          {activeTag ? (
            <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
              <button onClick={() => from.startsWith('item:') ? navigate(`/item/${from.replace('item:', '')}`) : navigate('/library')} className="mb-2 flex items-center gap-1 text-[13px] font-semibold text-violet-700"><ArrowLeft size={16} /> Back</button>
              <div className="flex items-start justify-between gap-3"><div><Badge color="violet" variant="subtle">Tag</Badge><h1 className="mt-1 text-[22px] font-bold text-slate-900">{activeTag.label}</h1><p className="mt-1 text-[12px] text-slate-600">{baseItems.length} items. {limitedCount} limited.</p></div><button onClick={() => navigate(`/ask?scope=tag&tag=${activeTag.slug}`)} className="rounded-full bg-violet-600 px-3 py-2 text-[12px] font-bold text-white">Ask</button></div>
            </div>
          ) : <div className="mb-4 flex items-center justify-between"><h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Library</h1><button onClick={() => setFilterSheetOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"><SlidersHorizontal size={18} /></button></div>}
          <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search your Brain..." className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-[15px] focus:ring-2 focus:ring-slate-900 focus:outline-none" /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => filter === 'All' ? setFilterSheetOpen(true) : applyFilter('All')} className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${filter === 'All' ? 'bg-slate-900 text-white' : 'border border-violet-200 bg-violet-50 text-violet-900'}`}>
              <span className="truncate">{filter === 'All' ? 'All items' : filter}</span>{filter !== 'All' && <X size={13} />}
            </button>
            <button onClick={() => setFilterSheetOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700"><SlidersHorizontal size={15} /> Filter <ChevronDown size={14} /></button>
            <span className="ml-auto text-[12px] font-semibold text-slate-500">{filtered.length} shown</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{activeTag ? 'Tagged items' : filter === 'All' ? 'Recent items' : `${filter} items`}</h2>
          {filtered.map((item) => {
            const isSelected = selectedIds.has(item.id)
            return <button key={item.id} onClick={() => openItem(item.id)} onContextMenu={(e) => { e.preventDefault(); setIsSelectMode(true); setSelectedIds(new Set([item.id])) }} className={`w-full text-left bg-white rounded-xl border p-3.5 transition-all ${isSelected ? 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/30' : 'border-slate-200 active:scale-[0.98]'}`}><div className="flex gap-3">{isSelectMode && <span onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}>{isSelected ? <CheckCircle2 size={20} className="text-violet-600" /> : <Circle size={20} className="text-slate-300" />}</span>}<div className="flex-1 min-w-0"><p className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{item.title}</p><div className="flex items-center gap-2 flex-wrap mt-2"><Badge color={qualityColor(item.quality)} variant="subtle">{item.quality}</Badge>{item.offlineAvailable && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"><WifiOff size={10} /> Offline</span>}{item.needsUpgradeReason && <span className="inline-flex items-center gap-1 text-[11px] text-amber-700"><AlertTriangle size={11} /> Limited</span>}</div><p className="text-[12px] text-slate-500 mt-2">{item.sourceType} / Via {item.capturedVia}</p></div><MoreVertical size={18} className="text-slate-300" /></div></button>
          })}
          {!activeTag && weakCount > 0 && <button onClick={() => navigate('/needs-upgrade')} className="w-full bg-rose-50 rounded-xl border border-rose-200 p-4 flex items-center justify-between"><div><p className="text-[14px] font-bold text-rose-900">Needs upgrade</p><p className="text-[12px] text-rose-700">{weakCount} items need attention</p></div><span className="text-rose-600 font-bold">Go</span></button>}
        </div>
      </div>
      <MobileBottomNav />
      {filterSheetOpen && <div className="absolute inset-0 z-50 flex items-end bg-black/25" onClick={() => setFilterSheetOpen(false)}>
        <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-[20px] font-bold text-slate-900">Filters</h2><p className="text-[12px] text-slate-500">{filter === 'All' ? `${baseItems.length} items in this view` : `${filtered.length} ${filter} items shown`}</p></div><button onClick={() => setFilterSheetOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100"><X size={18} /></button></div>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[13px] font-bold text-slate-700">Current filter</span><button onClick={() => applyFilter('All', true)} className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${filter === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>{filter === 'All' ? 'All items' : 'Reset'}</button></div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Quality and access</p>
          <div className="mb-5 grid grid-cols-2 gap-2">{primaryFilters.map((f) => <button key={f} onClick={() => applyFilter(f, true)} className={`min-h-11 rounded-xl border px-3 text-[13px] font-bold ${filterButtonClass(f)}`}>{f === 'All' ? 'All items' : f}</button>)}</div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Source type</p>
          <div className="grid grid-cols-2 gap-2">{sourceFilters.map((f) => <button key={f} onClick={() => applyFilter(f, true)} className={`min-h-11 rounded-xl border px-3 text-[13px] font-bold ${filterButtonClass(f, 'violet')}`}>{f}</button>)}</div>
        </div>
      </div>}
    </div>
  )
}
