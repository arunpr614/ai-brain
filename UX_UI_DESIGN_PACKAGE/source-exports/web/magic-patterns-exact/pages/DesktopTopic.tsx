import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { Input } from '../components/ui/Input'
import { countLimitedSources, getSourcesByTopic, getTopicBySlug, collections } from '../data/sources'
import { ArrowLeft, BookOpen, Check, FolderPlus, MessageSquare, Plus, Search, Sparkles, X } from 'lucide-react'

export function DesktopTopic() {
  const { topicSlug = '' } = useParams<{ topicSlug: string }>()
  const navigate = useNavigate()
  const topic = getTopicBySlug(topicSlug)
  const [drawer, setDrawer] = useState<'collection' | null>(null)
  const [createdTag, setCreatedTag] = useState(false)
  if (!topic) return <div className="p-8 text-ink-500">Topic not found</div>
  const items = getSourcesByTopic(topic.slug)
  const limitedCount = countLimitedSources(items)
  return (
    <div className="h-full overflow-y-auto bg-canvas p-8">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <div className="bg-panel border border-line rounded-card p-6 mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><Badge variant="azure" style="soft">Detected topic</Badge><Badge variant="neutral" style="soft">Prototype sample</Badge></div>
            <h1 className="text-3xl font-bold text-ink">{topic.label}</h1>
            <p className="text-sm text-ink-600 mt-2 max-w-2xl">This prototype shows how topic exploration will work. Topic evidence is sample content until live extraction and scoring are confirmed.</p>
          </div>
          <div className="flex gap-2 shrink-0"><Button variant="violet" leftIcon={<MessageSquare size={16} />} onClick={() => navigate(`/ask?scope=topic&topic=${topic.slug}`)}>Ask this topic</Button><Button variant="secondary" leftIcon={<Plus size={16} />} onClick={() => setCreatedTag(true)}>Create tag</Button><Button variant="secondary" leftIcon={<FolderPlus size={16} />} onClick={() => setDrawer('collection')}>Add to collection</Button></div>
        </div>
        {createdTag && <div className="mt-4 rounded-card border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 flex items-center gap-2"><Check size={16} /> Created user-managed tag from this topic.</div>}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
        <main className="space-y-4">
          <section className="bg-panel border border-line rounded-card p-5"><h2 className="text-lg font-bold text-ink mb-2 flex items-center gap-2"><Sparkles size={18} className="text-azure-600" /> Why this topic appears</h2><p className="text-sm leading-relaxed text-ink-700">{topic.explanation}</p><div className="mt-4 rounded-card bg-canvas border border-line p-4"><p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-1">Example evidence</p><p className="text-sm text-ink-700">{topic.evidence}</p></div></section>
          <section className="bg-panel border border-line rounded-card p-5"><h2 className="text-lg font-bold text-ink mb-4">Items covering this topic</h2><div className="space-y-3">{items.map((item) => <button key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="w-full rounded-card border border-line bg-canvas p-4 text-left hover:border-azure-300"><div className="flex justify-between gap-3"><p className="font-bold text-ink">{item.title}</p><Badge variant={item.quality === 'Metadata only' ? 'coral' : item.quality === 'Preview only' ? 'amber' : item.quality === 'Needs upgrade' ? 'ruby' : 'teal'} style="soft">{item.quality}</Badge></div><p className="text-sm text-ink-600 mt-2">{item.snippet}</p></button>)}</div></section>
        </main>
        <aside className="space-y-4"><section className="bg-panel border border-line rounded-card p-5"><h2 className="text-lg font-bold text-ink mb-3">Scope health</h2><p className="text-sm text-ink-600">{items.length} items in this prototype topic.</p><p className="text-sm text-ink-600 mt-1">{limitedCount} may have limited readable text.</p></section><section className="bg-panel border border-line rounded-card p-5"><h2 className="text-lg font-bold text-ink mb-3">Related topics</h2><div className="flex flex-wrap gap-2">{topic.related.map((label) => <span key={label} className="rounded-chip border border-line bg-canvas px-3 py-1 text-sm text-ink-700">{label}</span>)}</div></section></aside>
      </div>
      <Drawer isOpen={drawer === 'collection'} onClose={() => setDrawer(null)} position="right" size="md"><div className="p-6 space-y-5"><div className="flex justify-between"><h2 className="text-xl font-bold text-ink">Add matching items to collection</h2><button onClick={() => setDrawer(null)}><X size={18} /></button></div><Input placeholder="Search collections" startAdornment={<Search size={15} />} />{collections.map((collection) => <label key={collection.id} className="flex items-center gap-3 rounded-card border border-line p-3"><input type="checkbox" /><span>{collection.label}</span></label>)}<Button className="w-full" onClick={() => setDrawer(null)}>Apply</Button></div></Drawer>
    </div>
  )
}
