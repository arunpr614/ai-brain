import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Drawer } from '../components/ui/Drawer'
import { Input } from '../components/ui/Input'
import { getCollectionsForSource, getSourceById, getTagsForSource, getTopicsForSource, collections, tags, slugify, SourceQuality } from '../data/sources'
import { AlertTriangle, ArrowLeft, BookOpen, Check, ExternalLink, Folder, Maximize2, MessageSquare, Plus, Search, Sparkles, Tag, Trash2, X } from 'lucide-react'

type Panel = 'tag' | 'collection' | null

function qualityVariant(quality: SourceQuality) {
  if (quality === 'Full text') return 'teal'
  if (quality === 'Transcript') return 'cyan'
  if (quality === 'Preview only') return 'amber'
  if (quality === 'Metadata only') return 'coral'
  if (quality === 'Needs upgrade') return 'ruby'
  return 'neutral'
}

export function DesktopItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const source = getSourceById(id || '')
  const [panel, setPanel] = useState<Panel>(null)
  const [tagInput, setTagInput] = useState('research methods')
  const [notice, setNotice] = useState<string | null>(null)
  const [pickedCollections, setPickedCollections] = useState<Set<string>>(new Set(source?.collectionIds || []))

  const isFocusMode = searchParams.get('mode') === 'focus'

  if (!source) {
    return <div className="p-8 text-ink-500">Item not found</div>
  }

  const itemTags = getTagsForSource(source)
  const itemTopics = getTopicsForSource(source)
  const itemCollections = getCollectionsForSource(source)
  const hasReadableBody = source.quality === 'Full text' || source.quality === 'Transcript' || source.quality === 'Preview only'
  const duplicateTag = tags.some((tag) => tag.slug === slugify(tagInput))

  const readableCopy = useMemo(() => {
    if (source.quality === 'Preview only') {
      return 'This is a preview-only item. The focus reader shows the captured excerpt and keeps the upgrade action visible.'
    }
    if (!hasReadableBody) {
      return 'Brain saved the source details, but there is not enough readable text yet.'
    }
    return 'This prototype reading body shows how saved source text stays primary while AI organization remains in the side rail.'
  }, [hasReadableBody, source.quality])

  const enterFocus = () => {
    setSearchParams({ mode: 'focus' })
  }

  const exitFocus = () => {
    setSearchParams({})
  }

  const removeTag = (label: string) => {
    setNotice(`Removed ${label} from this item. Undo`)
  }

  const applyTag = () => {
    setNotice(duplicateTag ? `Added existing tag ${tagInput} to this item.` : `Created tag ${tagInput} and added it to this item.`)
    setPanel(null)
  }

  const applyCollections = () => {
    setNotice('Collection updates applied to this item.')
    setPanel(null)
  }

  if (isFocusMode) {
    return (
      <div className="h-full bg-panel overflow-y-auto">
        <div className="sticky top-0 z-20 bg-panel/95 backdrop-blur border-b border-line px-8 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Focus mode</p>
            <h1 className="text-lg font-bold text-ink truncate">{source.title}</h1>
          </div>
          <Button variant="secondary" leftIcon={<X size={16} />} onClick={exitFocus}>Exit</Button>
        </div>
        <main className="max-w-3xl mx-auto px-8 py-10">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Badge variant={qualityVariant(source.quality)} style="soft">{source.quality}</Badge>
            <span className="text-sm text-ink-500">{source.sourceType}</span>
            <span className="text-sm text-ink-300">/</span>
            <span className="text-sm text-ink-500">Captured via {source.capturedVia}</span>
          </div>
          {source.needsUpgradeReason && (
            <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-950">Readable text is limited</p>
                <p className="text-sm text-amber-900">Use the normal item page to add full text before relying on deep reading or scoped Ask.</p>
              </div>
            </div>
          )}
          <article className="prose prose-slate max-w-none">
            <h2>Introduction to the saved source</h2>
            <p>{readableCopy}</p>
            <p>{source.snippet}</p>
            <h2>Source-grounded reading</h2>
            <p>The reader keeps the original material in front. Tags, detected topics, and collections stay outside focus mode so this screen stays for reading.</p>
            <h2>What Brain can help with next</h2>
            <p>After reading, return to the item detail page to explore topics, manage tags, add the item to collections, or ask across a specific scope.</p>
          </article>
        </main>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      {notice && (
        <div className="fixed top-5 right-5 z-40 rounded-card bg-ink text-white px-4 py-3 text-sm shadow-raised flex items-center gap-3">
          <Check size={16} />
          <span>{notice}</span>
          <button aria-label="Dismiss" onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-8 p-8">
        <main>
          <button onClick={() => navigate('/library')} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-600 hover:text-ink">
            <ArrowLeft size={16} /> Back to Library
          </button>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink-500">
            <span className="font-bold text-ink">{source.sourceType}</span>
            <span>/</span>
            <span>Captured via {source.capturedVia}</span>
            <span>/</span>
            <span>{source.capturedTime || source.savedDate}</span>
            <Badge variant={qualityVariant(source.quality)} style="soft">{source.quality}</Badge>
          </div>
          <h1 className="text-4xl font-bold text-ink leading-tight mb-6">{source.title}</h1>
          <div className="flex items-center gap-3 mb-8">
            <Button variant="secondary" leftIcon={<ExternalLink size={16} />}>Open source</Button>
            <span className="text-sm text-ink-500 truncate">{source.url || 'https://example.com/source-url-placeholder'}</span>
          </div>

          <section className="bg-panel border border-line rounded-card p-6 relative">
            <button aria-label="Open focus mode" onClick={enterFocus} className="absolute right-5 top-5 w-11 h-11 rounded-chip border border-azure-300 text-azure-700 bg-azure-50 flex items-center justify-center hover:bg-azure-100 focus:outline-none focus:ring-2 focus:ring-azure-500">
              <Maximize2 size={19} />
            </button>
            <h2 className="text-2xl font-bold text-ink mb-5 pr-16">Introduction to the Core Concepts</h2>
            {source.needsUpgradeReason && (
              <div className="mb-5 rounded-card border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-950">Readable text is limited</p>
                <p className="text-sm text-amber-900">{source.needsUpgradeReason}. Tags and collections still work, but topics and scoped Ask need readable content.</p>
                <Button className="mt-3" size="small" variant="secondary" leftIcon={<Plus size={14} />}>Add full text</Button>
              </div>
            )}
            <p className="text-lg leading-8 text-ink-800 mb-5">{readableCopy}</p>
            <p className="text-lg leading-8 text-ink-800 mb-5">{source.snippet}</p>
            <h3 className="text-2xl font-bold text-ink mt-8 mb-4">Practical Applications and Methodology</h3>
            <p className="text-lg leading-8 text-ink-800">This design state keeps source quality visible while making organization actions explicit and reversible.</p>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="bg-panel border border-line rounded-card p-5">
            <h2 className="text-lg font-bold text-ink mb-4">Source & Capture Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Original source</dt><dd className="font-bold text-ink">{source.sourceType}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Captured via</dt><dd className="font-bold text-ink">{source.capturedVia}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Captured</dt><dd className="font-bold text-ink text-right">{source.capturedTime || source.savedDate}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Offline</dt><dd className="font-bold text-ink">{source.offlineAvailable ? 'Available' : 'Not saved'}</dd></div>
            </dl>
          </section>

          <section className="bg-panel border border-line rounded-card p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-lg font-bold text-ink">Tags</h2>
                <p className="text-xs text-ink-500 mt-1">Tags can be edited and used to find related saved items.</p>
              </div>
              <Button size="small" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => setPanel('tag')}>Add tag</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {itemTags.length === 0 && <p className="text-sm text-ink-500">No tags yet.</p>}
              {itemTags.map((tag) => (
                <button key={tag.id} onClick={() => navigate(`/library?tag=${tag.slug}`)} className="rounded-chip border border-line bg-canvas px-3 py-1.5 text-sm font-medium text-ink hover:border-ink focus:outline-none focus:ring-2 focus:ring-azure-500" title={`View items tagged ${tag.label}`}>
                  <span className="mr-1 text-[11px] uppercase text-violet-600">{tag.provenance.includes('Brain') ? 'Suggested' : 'You'}</span>
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-panel border border-line rounded-card p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-lg font-bold text-ink">Included topics</h2>
                <p className="text-xs text-ink-500 mt-1">Topics help explore concepts covered by this item.</p>
              </div>
              <Badge variant="azure" style="soft">Detected in this item</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {itemTopics.length === 0 && <p className="text-sm text-ink-500">Topics appear after Brain can read the content.</p>}
              {itemTopics.map((topic) => (
                <button key={topic.id} onClick={() => navigate(`/topics/${topic.slug}?from=${source.id}`)} className="rounded-chip border border-azure-100 bg-azure-50 px-3 py-1.5 text-sm font-medium text-azure-800 hover:border-azure-400 focus:outline-none focus:ring-2 focus:ring-azure-500" title={`Explore topic ${topic.label}`}>
                  {topic.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-panel border border-line rounded-card p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-lg font-bold text-ink">Collections</h2>
                <p className="text-xs text-ink-500 mt-1">Collections are saved spaces you manage.</p>
              </div>
              <Button size="small" variant="secondary" leftIcon={<Folder size={14} />} onClick={() => setPanel('collection')}>Add</Button>
            </div>
            <div className="space-y-2 mt-4">
              {itemCollections.length === 0 && <p className="text-sm text-ink-500">Not in a collection yet.</p>}
              {itemCollections.map((collection) => (
                <button key={collection.id} onClick={() => navigate(`/collections/${collection.slug}`)} className="w-full rounded-card border border-magenta-100 bg-magenta-50 px-3 py-2 text-left text-sm font-bold text-magenta-800 hover:border-magenta-300 focus:outline-none focus:ring-2 focus:ring-magenta-300 flex items-center gap-2">
                  <Folder size={15} /> {collection.label}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-panel border border-line rounded-card p-5">
            <h2 className="text-lg font-bold text-ink mb-3">AI Digest</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-ink-700 list-disc pl-4">
              <li>Shows the source quality before any AI interpretation.</li>
              <li>Keeps tags editable, topics detected, and collections user-managed.</li>
              <li>Use scoped Ask only when the source set has enough readable text.</li>
            </ul>
          </section>
        </aside>
      </div>

      <Drawer isOpen={panel === 'tag'} onClose={() => setPanel(null)} position="right" size="md">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-xl font-bold text-ink">Add tag</h2><p className="text-sm text-ink-500 mt-1">Local action: add or remove tags from this item only.</p></div>
            <button onClick={() => setPanel(null)} aria-label="Close"><X size={18} /></button>
          </div>
          <Input label="Search or create tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} startAdornment={<Search size={15} />} />
          {duplicateTag ? <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Already exists. Add existing tag instead?</div> : <div className="rounded-card border border-line bg-canvas p-3 text-sm text-ink-600">This will create a new user-managed tag.</div>}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">Attached tags</p>
            <div className="space-y-2">{itemTags.map((tag) => <div key={tag.id} className="flex items-center justify-between rounded-chip border border-line px-3 py-2 text-sm"><span>{tag.label}</span><button onClick={() => removeTag(tag.label)} className="text-ruby-600 text-xs font-bold">Remove from this item</button></div>)}</div>
          </div>
          <Button onClick={applyTag} className="w-full">Apply tag</Button>
        </div>
      </Drawer>

      <Drawer isOpen={panel === 'collection'} onClose={() => setPanel(null)} position="right" size="md">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-ink">Add to collection</h2><p className="text-sm text-ink-500 mt-1">Local action: update this item membership.</p></div><button onClick={() => setPanel(null)} aria-label="Close"><X size={18} /></button></div>
          <Input placeholder="Search collections" startAdornment={<Search size={15} />} />
          <div className="space-y-2">{collections.map((collection) => <label key={collection.id} className="flex items-center gap-3 rounded-card border border-line p-3"><input type="checkbox" checked={pickedCollections.has(collection.id)} onChange={() => { const next = new Set(pickedCollections); next.has(collection.id) ? next.delete(collection.id) : next.add(collection.id); setPickedCollections(next) }} /><span className="font-medium text-ink">{collection.label}</span></label>)}</div>
          <div className="rounded-card border border-line bg-canvas p-3 text-sm text-ink-600">Create new collection: <span className="font-bold">Reading queue</span> is available as a prototype state.</div>
          <Button onClick={applyCollections} className="w-full">Apply collections</Button>
        </div>
      </Drawer>
    </div>
  )
}
