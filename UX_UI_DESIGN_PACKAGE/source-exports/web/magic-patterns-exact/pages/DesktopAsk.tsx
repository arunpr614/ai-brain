import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { countLimitedSources, getCollectionBySlug, getSourcesByCollection, getSourcesByTag, getSourcesByTopic, getTagBySlug, getTopicBySlug, isFullyReadable, sources } from '../data/sources'
import { AlertTriangle, BookOpen, MessageSquare, Plus, Sparkles } from 'lucide-react'

export function DesktopAsk() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const scope = params.get('scope') || 'all'
  const tag = params.get('tag') || ''
  const topic = params.get('topic') || ''
  const collectionSlug = params.get('collection') || ''
  const itemIds = (params.get('items') || '').split(',').filter(Boolean)

  let label = 'All saved items'
  let scopedItems = sources
  if (scope === 'tag' && tag) {
    const entity = getTagBySlug(tag)
    label = `Items tagged ${entity?.label || tag}`
    scopedItems = getSourcesByTag(tag)
  }
  if (scope === 'topic' && topic) {
    const entity = getTopicBySlug(topic)
    label = `Items with topic ${entity?.label || topic}`
    scopedItems = getSourcesByTopic(topic)
  }
  if (scope === 'collection' && collectionSlug) {
    const entity = getCollectionBySlug(collectionSlug)
    label = `Inside ${entity?.label || collectionSlug}`
    scopedItems = entity ? getSourcesByCollection(entity.id) : []
  }
  if (scope === 'selected') {
    label = 'Selected Library items'
    scopedItems = sources.filter((source) => itemIds.includes(source.id))
  }

  const readableItems = scopedItems.filter(isFullyReadable)
  const limitedCount = countLimitedSources(scopedItems)
  const hasReadableItems = readableItems.length > 0

  return (
    <div className="h-full flex bg-canvas overflow-hidden">
      <aside className="w-72 bg-panel border-r border-line p-4 overflow-y-auto"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-ink">Ask history</h2><Button size="small" variant="secondary" leftIcon={<Plus size={14} />}>New</Button></div>{['Research methods', 'Capture quality', 'Weekend reading'].map((item) => <button key={item} className="w-full text-left rounded-card border border-line p-3 mb-2 hover:bg-canvas"><p className="text-sm font-bold text-ink">{item}</p><p className="text-xs text-ink-500">Scoped conversation</p></button>)}</aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-line bg-panel p-6"><h1 className="text-2xl font-bold text-ink">Ask</h1><p className="text-sm text-ink-500 mt-1">Source-grounded answers with visible scope.</p></div>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <section className="bg-panel border border-line rounded-card p-5"><div className="flex items-start justify-between gap-5"><div><div className="flex items-center gap-2 mb-2"><Badge variant="violet" style="soft">Designed scope</Badge><Badge variant={limitedCount > 0 ? 'amber' : 'teal'} style="soft">{scopedItems.length} sources</Badge></div><h2 className="text-xl font-bold text-ink">Asking across: {label}</h2><p className="text-sm text-ink-600 mt-2">{readableItems.length} full-text or transcript source{readableItems.length === 1 ? '' : 's'} available. {limitedCount} limited source{limitedCount === 1 ? '' : 's'} may not answer fully.</p></div><Button variant="secondary" leftIcon={<BookOpen size={16} />} onClick={() => navigate(scope === 'tag' && tag ? `/library?tag=${tag}` : '/library')}>View sources</Button></div>{limitedCount > 0 && <div className="mt-4 rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-2"><AlertTriangle size={16} /> Some items in this scope are metadata-only, preview-only, or need upgrade.</div>}</section>
          {!hasReadableItems ? (
            <section className="bg-panel border border-line rounded-card p-10 text-center"><AlertTriangle size={28} className="mx-auto text-amber-600 mb-3" /><h2 className="text-xl font-bold text-ink">There is not enough readable text in this scope yet.</h2><p className="text-sm text-ink-500 mt-2">Add full text or open matching items before expecting a grounded answer.</p><Button className="mt-5" onClick={() => navigate('/needs-upgrade')}>Open matching items</Button></section>
          ) : (
            <section className="bg-panel border border-line rounded-card p-6"><div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-violet-600" /><span className="text-xs font-bold uppercase tracking-wide text-ink-400">AI Brain</span></div><p className="text-lg leading-8 text-ink-800">This prototype answer stays inside the visible scope. It uses readable items first and warns when limited captures could affect the answer.</p><div className="mt-5 space-y-3"><p className="text-xs font-bold uppercase tracking-wide text-ink-400">Citations</p>{scopedItems.slice(0, 3).map((item, index) => <button key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="w-full text-left rounded-card border border-line bg-canvas p-3 hover:border-violet-300"><span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-violet-50 text-violet-700 text-xs font-bold mr-2">{index + 1}</span><span className="font-bold text-ink">{item.title}</span><Badge className="ml-2" variant={isFullyReadable(item) ? 'teal' : 'amber'} style="soft">{item.quality}</Badge></button>)}</div></section>
          )}
        </div>
        <div className="border-t border-line bg-panel p-4"><div className="flex items-center gap-3 rounded-chip border border-line bg-canvas px-4 py-3"><MessageSquare size={18} className="text-ink-400" /><input className="flex-1 bg-transparent text-sm outline-none" placeholder={`Ask within ${label}...`} /><Button size="small">Send</Button></div></div>
      </main>
    </div>
  )
}
