import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { Input } from '../components/ui/Input'
import { getCollectionBySlug, getSourcesByCollection, sources } from '../data/sources'
import { ArrowLeft, Folder, MessageSquare, Plus, Search, X } from 'lucide-react'

export function DesktopCollection() {
  const { collectionSlug = '' } = useParams<{ collectionSlug: string }>()
  const navigate = useNavigate()
  const collection = getCollectionBySlug(collectionSlug)
  const [drawer, setDrawer] = useState<'add' | 'rename' | null>(null)
  const [name, setName] = useState(collection?.label || '')
  if (!collection) return <div className="p-8 text-ink-500">Collection not found</div>
  const items = getSourcesByCollection(collection.id)
  return (
    <div className="h-full overflow-y-auto bg-canvas p-8">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink"><ArrowLeft size={16} /> Back</button>
      <div className="bg-panel border border-line rounded-card p-6 mb-6 flex items-start justify-between gap-6">
        <div><div className="flex items-center gap-2 mb-2"><Badge variant="magenta" style="soft">Created by you</Badge><Badge variant="neutral" style="soft">Collection</Badge></div><h1 className="text-3xl font-bold text-ink flex items-center gap-3"><Folder size={28} /> {collection.label}</h1><p className="text-sm text-ink-600 mt-2 max-w-2xl">{collection.description}</p><p className="text-xs text-ink-500 mt-2">{items.length} items. Collections are saved spaces you manage.</p></div>
        <div className="flex gap-2 shrink-0"><Button variant="violet" leftIcon={<MessageSquare size={16} />} onClick={() => navigate(`/ask?scope=collection&collection=${collection.slug}`)}>Ask collection</Button><Button variant="secondary" leftIcon={<Plus size={16} />} onClick={() => setDrawer('add')}>Add items</Button><Button variant="secondary" onClick={() => setDrawer('rename')}>Rename</Button></div>
      </div>
      <div className="bg-panel border border-line rounded-card p-5 mb-4 flex items-center justify-between gap-4"><Input placeholder="Search within collection" startAdornment={<Search size={15} />} className="max-w-sm flex-1" /><select className="h-10 rounded-chip border border-line-strong bg-panel px-3 text-sm"><option>Recently added</option><option>Saved date</option><option>Title</option></select></div>
      <div className="space-y-3">{items.length === 0 && <div className="bg-panel border border-line rounded-card p-10 text-center text-ink-500">No items in this collection yet. Add items from Library or from an item detail page.</div>}{items.map((item) => <button key={item.id} onClick={() => navigate(`/item/${item.id}`)} className="w-full bg-panel border border-line rounded-card p-4 text-left hover:border-magenta-300"><div className="flex justify-between gap-3"><p className="font-bold text-ink">{item.title}</p><Badge variant={item.quality === 'Metadata only' ? 'coral' : item.quality === 'Preview only' ? 'amber' : item.quality === 'Needs upgrade' ? 'ruby' : 'teal'} style="soft">{item.quality}</Badge></div><p className="text-sm text-ink-600 mt-2">{item.snippet}</p></button>)}</div>
      <Drawer isOpen={drawer === 'add'} onClose={() => setDrawer(null)} position="right" size="md"><div className="p-6 space-y-5"><div className="flex justify-between"><h2 className="text-xl font-bold text-ink">Add items</h2><button onClick={() => setDrawer(null)}><X size={18} /></button></div><Input placeholder="Search Library" startAdornment={<Search size={15} />} />{sources.slice(0, 5).map((item) => <label key={item.id} className="flex items-center gap-3 rounded-card border border-line p-3"><input type="checkbox" defaultChecked={collection.itemIds.includes(item.id)} /><span className="text-sm font-medium text-ink">{item.title}</span></label>)}<Button className="w-full" onClick={() => setDrawer(null)}>Apply item changes</Button></div></Drawer>
      <Drawer isOpen={drawer === 'rename'} onClose={() => setDrawer(null)} position="right" size="sm"><div className="p-6 space-y-5"><div className="flex justify-between"><h2 className="text-xl font-bold text-ink">Rename collection</h2><button onClick={() => setDrawer(null)}><X size={18} /></button></div><Input label="Collection name" value={name} onChange={(e) => setName(e.target.value)} /><div className="rounded-card border border-line bg-canvas p-3 text-sm text-ink-600">Global action: this would rename the collection for all items.</div><Button className="w-full" onClick={() => setDrawer(null)}>Save name</Button></div></Drawer>
    </div>
  )
}
