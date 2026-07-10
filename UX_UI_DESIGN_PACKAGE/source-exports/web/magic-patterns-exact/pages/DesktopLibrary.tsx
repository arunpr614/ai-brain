import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { Search, Tag, FolderPlus, Trash2, X, AlertTriangle } from 'lucide-react'
import { countLimitedSources, getSourcesByTag, getTagBySlug, sources, Source, SourceQuality, SourceType } from '../data/sources'

type BulkAction = 'tags' | 'collections' | null

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>

function qualityVariant(quality: SourceQuality): BadgeVariant {
  if (quality === 'Full text') return 'teal'
  if (quality === 'Transcript') return 'cyan'
  if (quality === 'Preview only') return 'amber'
  if (quality === 'Metadata only') return 'coral'
  if (quality === 'Needs upgrade') return 'ruby'
  return 'neutral'
}

export function DesktopLibrary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tagSlug = searchParams.get('tag') || ''
  const activeTag = tagSlug ? getTagBySlug(tagSlug) : undefined
  const [selectedQuality, setSelectedQuality] = useState<SourceQuality | 'All'>('All')
  const [selectedType, setSelectedType] = useState<SourceType | 'All'>('All')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const baseSources = activeTag ? getSourcesByTag(activeTag.slug) : sources
  const filteredSources = useMemo(() => {
    return baseSources.filter((source) => {
      const qualityOk = selectedQuality === 'All' || source.quality === selectedQuality
      const typeOk = selectedType === 'All' || source.sourceType === selectedType
      return qualityOk && typeOk
    })
  }, [baseSources, selectedQuality, selectedType])

  const limitedCount = countLimitedSources(baseSources)
  const selectedSources = sources.filter((source) => selectedIds.has(source.id))
  const qualityFilters: (SourceQuality | 'All')[] = ['All', 'Needs upgrade', 'Full text', 'Metadata only', 'Preview only']
  const typeFilters: (SourceType | 'All')[] = ['All', 'YouTube', 'LinkedIn', 'Substack', 'PDF', 'Manual note']

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  const askSelected = () => {
    if (selectedIds.size === 0) return
    navigate(`/ask?scope=selected&items=${Array.from(selectedIds).join(',')}`)
  }

  const applyBulk = (label: string) => {
    setNotice(label)
    setBulkAction(null)
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      {notice && <div className="fixed top-5 right-5 z-40 rounded-card bg-ink text-white px-4 py-3 text-sm shadow-raised flex items-center gap-3"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={14} /></button></div>}
      <div className="bg-panel border-b border-line p-6 sticky top-0 z-10">
        {activeTag ? (
          <div className="mb-5 rounded-card border border-violet-100 bg-violet-50 p-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Badge variant="violet" style="soft">Tag</Badge><h1 className="text-2xl font-bold text-ink">{activeTag.label}</h1></div>
              <p className="text-sm text-ink-600">{baseSources.length} items. {limitedCount} item{limitedCount === 1 ? '' : 's'} may have limited readable text.</p>
              <p className="text-xs text-ink-500 mt-1">{activeTag.provenance}. Tag views are designed scopes in this prototype.</p>
            </div>
            <div className="flex gap-2 shrink-0"><Button variant="violet" onClick={() => navigate(`/ask?scope=tag&tag=${activeTag.slug}`)}>Ask this tag</Button><Button variant="secondary" onClick={() => navigate('/settings')}>Manage tag</Button><Button variant="tertiary" onClick={() => navigate('/library')}>Clear</Button></div>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-ink mb-4">Library</h1>
        )}
        <Input placeholder="Search your memory..." startAdornment={<Search size={16} className="text-ink-400" />} className="mb-4 max-w-2xl" />
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-medium text-ink-500 mr-2 uppercase tracking-wide">Type</span>{typeFilters.map((filter) => <button key={filter} onClick={() => setSelectedType(filter)} className={`px-3 py-1.5 text-xs font-medium rounded-chip transition-colors ${selectedType === filter ? 'bg-ink text-white' : 'bg-panel text-ink-600 border border-line hover:bg-canvas'}`}>{filter === 'Manual note' ? 'Notes' : filter}</button>)}</div>
          <div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-medium text-ink-500 mr-2 uppercase tracking-wide">Quality</span>{qualityFilters.map((filter) => <button key={filter} onClick={() => setSelectedQuality(filter)} className={`px-3 py-1.5 text-xs font-medium rounded-chip transition-colors ${selectedQuality === filter ? 'bg-ink text-white' : 'bg-panel text-ink-600 border border-line hover:bg-canvas'}`}>{filter}</button>)}</div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-ink text-white px-6 py-3 flex items-center justify-between sticky top-[180px] z-20 shadow-raised gap-4">
          <span className="text-sm font-bold">{selectedIds.size} selected</span>
          <div className="flex gap-2 flex-wrap justify-end"><Button variant="violet" onClick={askSelected}>Ask selected</Button><Button variant="secondary" leftIcon={<Tag size={16} />} onClick={() => setBulkAction('tags')}>Add tags</Button><Button variant="secondary" leftIcon={<FolderPlus size={16} />} onClick={() => setBulkAction('collections')}>Add to collection</Button><Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={() => setNotice('Delete confirmation shown in production. Prototype action is intentionally non-destructive.')}>Delete</Button><Button variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button></div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredSources.map((source: Source) => {
          const isSelected = selectedIds.has(source.id)
          return (
            <div key={source.id} className={`bg-panel border rounded-card p-4 transition-all ${isSelected ? 'border-azure-500 ring-2 ring-azure-100' : 'border-line hover:border-line-strong'}`}>
              <div className="flex gap-4">
                <input aria-label={`Select ${source.title}`} type="checkbox" checked={isSelected} onChange={() => toggleSelection(source.id)} className="mt-1 h-4 w-4" />
                <button onClick={() => navigate(`/item/${source.id}`)} className="flex-1 text-left min-w-0">
                  <div className="flex items-start justify-between gap-4"><h3 className="text-lg font-bold text-ink hover:text-azure-700">{source.title}</h3><Badge variant={qualityVariant(source.quality)} style="soft">{source.quality}</Badge></div>
                  <div className="flex items-center gap-2 text-sm text-ink-500 mt-2 flex-wrap"><span className="font-bold text-ink-700">{source.sourceType}</span><span>/</span><span>Via {source.capturedVia}</span><span>/</span><span>{source.savedDate}</span>{source.needsUpgradeReason && <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={13} /> {source.needsUpgradeReason}</span>}</div>
                  <p className="text-sm text-ink-700 mt-2 line-clamp-2">{source.snippet}</p>
                </button>
              </div>
            </div>
          )
        })}
        {filteredSources.length === 0 && <div className="bg-panel border border-line rounded-card p-10 text-center text-ink-500">No items match this view.</div>}
      </div>

      <Drawer isOpen={bulkAction !== null} onClose={() => setBulkAction(null)} position="right" size="md">
        <div className="p-6 space-y-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">{bulkAction === 'tags' ? 'Add tags' : 'Add to collection'}</h2><p className="text-sm text-ink-500 mt-1">Applies to {selectedSources.length} selected item{selectedSources.length === 1 ? '' : 's'}.</p></div><button aria-label="Close" onClick={() => setBulkAction(null)}><X size={18} /></button></div><Input placeholder={bulkAction === 'tags' ? 'Search or create tag' : 'Search collections'} startAdornment={<Search size={15} />} /><div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Duplicate checks and undo states are represented in this prototype before applying changes.</div><Button className="w-full" onClick={() => applyBulk(bulkAction === 'tags' ? 'Tags added to selected items. Undo' : 'Selected items added to collection. Undo')}>Apply</Button></div>
      </Drawer>
    </div>
  )
}
