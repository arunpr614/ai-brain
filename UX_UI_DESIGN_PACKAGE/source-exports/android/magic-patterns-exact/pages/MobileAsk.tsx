import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, BadgeColor } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  FileText,
  History,
  Keyboard,
  Link2,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  StickyNote,
  X,
} from 'lucide-react'
import {
  Source,
  SourceQuality,
  countLimitedSources,
  getCollectionBySlug,
  getSourcesByCollection,
  getSourcesByTag,
  getSourcesByTopic,
  getTagBySlug,
  getTopicBySlug,
  isFullyReadable,
  sources,
} from '../data/sources'
import { conversations } from '../data/conversations'

type Sheet = null | 'addContext' | 'attachPicker' | 'pasteLink' | 'writeNote' | 'attachedSources' | 'history'
type PasteOutcome = 'full' | 'metadata' | 'duplicate'
type PasteStatus = 'idle' | 'saving' | 'saved'

type CitationSource = {
  id: string
  title: string
  sourceType: string
  capturedVia: string
  quality: SourceQuality
  snippet: string
  simulated?: boolean
}

type AskMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: CitationSource[]
  warning?: string
  scopeLabel?: string
  loading?: boolean
}

type HistoryItem = {
  id: string
  title: string
  time: string
  scopeLabel: string
  attachedIds: string[]
  question: string
  answer: string
  citationIds: string[]
  warning?: boolean
}

const sampleHistory: HistoryItem[] = [
  {
    id: 'h-attached',
    title: 'Compare attention and model architecture',
    time: 'Today',
    scopeLabel: 'Using attached context',
    attachedIds: ['1', '8'],
    question: 'How do these two sources explain architecture choices?',
    answer: 'Both sources frame architecture as a tradeoff between useful context, reliability, and implementation complexity.',
    citationIds: ['1', '8'],
  },
  {
    id: 'h-limited',
    title: 'Capture quality risks',
    time: 'Yesterday',
    scopeLabel: 'Scope: Topic: Capture quality',
    attachedIds: [],
    question: 'Which saved items are weak for Ask?',
    answer: 'The weak spots are mostly metadata-only, preview-only, or failed extraction items. Upgrade those before relying on answers.',
    citationIds: ['2', '3', '4'],
    warning: true,
  },
  {
    id: 'h-note',
    title: 'Weekend project synthesis',
    time: 'Jun 10',
    scopeLabel: 'Scope: Collection: Weekend reading',
    attachedIds: ['6'],
    question: 'Turn this into a small weekend plan.',
    answer: 'Start with offline reading behavior, then turn the notes into a source quality checklist and a narrow prototype.',
    citationIds: ['6'],
  },
]

function qualityColor(quality: SourceQuality): BadgeColor {
  if (quality === 'Full text') return 'teal'
  if (quality === 'Transcript') return 'cyan'
  if (quality === 'Preview only') return 'amber'
  if (quality === 'Metadata only') return 'coral'
  if (quality === 'Needs upgrade') return 'ruby'
  return 'slate'
}

function toCitationSource(source: Source): CitationSource {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    capturedVia: source.capturedVia,
    quality: source.quality,
    snippet: source.snippet,
  }
}

function citationIsFullyReadable(source: CitationSource): boolean {
  return source.quality === 'Full text' || source.quality === 'Transcript'
}

function countLimitedCitationSources(items: CitationSource[]): number {
  return items.filter((item) => !citationIsFullyReadable(item)).length
}

function sourceById(id: string): CitationSource | undefined {
  const source = sources.find((item) => item.id === id)
  return source ? toCitationSource(source) : undefined
}

function attachTitleFromUrl(value: string): string {
  const cleaned = value.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0]
  return cleaned ? cleaned.slice(0, 42) : 'Pasted link'
}

function ButtonRow({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left active:scale-[0.98] transition-transform">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-5 text-slate-500">{body}</span>
      </span>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  )
}

export function MobileAsk() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const scope = params.get('scope') || 'all'
  const tag = params.get('tag') || ''
  const topic = params.get('topic') || ''
  const collectionSlug = params.get('collection') || ''
  const itemIds = (params.get('items') || '').split(',').filter(Boolean)

  const routeScope = useMemo(() => {
    let label = 'All saved items'
    let scopedItems = sources
    if (scope === 'tag' && tag) {
      const entity = getTagBySlug(tag)
      label = `Tag: ${entity?.label || tag}`
      scopedItems = getSourcesByTag(tag)
    }
    if (scope === 'topic' && topic) {
      const entity = getTopicBySlug(topic)
      label = `Topic: ${entity?.label || topic}`
      scopedItems = getSourcesByTopic(topic)
    }
    if (scope === 'collection' && collectionSlug) {
      const entity = getCollectionBySlug(collectionSlug)
      label = `Collection: ${entity?.label || collectionSlug}`
      scopedItems = entity ? getSourcesByCollection(entity.id) : []
    }
    if (scope === 'selected') {
      label = 'Selected items'
      scopedItems = sources.filter((source) => itemIds.includes(source.id))
    }
    return { label, items: scopedItems.map(toCitationSource), sourceItems: scopedItems }
  }, [collectionSlug, itemIds, scope, tag, topic])

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [attachedSources, setAttachedSources] = useState<CitationSource[]>([])
  const [activeSheet, setActiveSheet] = useState<Sheet>(null)
  const [selectedAttachIds, setSelectedAttachIds] = useState<string[]>([])
  const [attachQuery, setAttachQuery] = useState('')
  const [pasteLinkValue, setPasteLinkValue] = useState('')
  const [pasteOutcome, setPasteOutcome] = useState<PasteOutcome>('full')
  const [pasteStatus, setPasteStatus] = useState<PasteStatus>('idle')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [nudge, setNudge] = useState<string | null>(null)
  const [keyboardPreview, setKeyboardPreview] = useState(false)
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null)

  const effectiveItems = attachedSources.length > 0 ? attachedSources : routeScope.items
  const effectiveLimited = countLimitedCitationSources(effectiveItems)
  const routeLimited = countLimitedSources(routeScope.sourceItems)
  const effectiveScopeLabel = attachedSources.length > 0
    ? routeScope.label === 'All saved items'
      ? 'Using attached context'
      : `Using attached context instead of ${routeScope.label}`
    : `Scope: ${routeScope.label}`
  const readableCount = effectiveItems.filter(citationIsFullyReadable).length
  const attachableSources = sources
    .filter((source) => source.title.toLowerCase().includes(attachQuery.toLowerCase()) || source.sourceType.toLowerCase().includes(attachQuery.toLowerCase()))
    .slice(0, 7)

  const upsertAttachment = (nextSource: CitationSource) => {
    setAttachedSources((current) => {
      if (current.some((source) => source.id === nextSource.id)) return current
      return [...current, nextSource]
    })
  }

  const removeAttachment = (id: string) => {
    setAttachedSources((current) => current.filter((source) => source.id !== id))
  }

  const toggleAttachSelection = (id: string) => {
    setSelectedAttachIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const attachSelectedSources = () => {
    selectedAttachIds
      .map(sourceById)
      .filter(Boolean)
      .forEach((source) => upsertAttachment(source as CitationSource))
    setSelectedAttachIds([])
    setAttachQuery('')
    setActiveSheet(null)
    setNudge(null)
  }

  const createAnswerText = (question: string) => {
    const scopeText = attachedSources.length > 0 ? 'the attached context' : routeScope.label.toLowerCase()
    return `Based on ${scopeText}, the useful pattern is to separate what the source clearly supports from what still needs a better capture. For "${question}", I would trust the full-text or transcript sources first, then mark limited sources as supporting context only.`
  }

  const handleSend = (questionOverride?: string) => {
    const question = (questionOverride || input).trim()
    setNudge(null)
    if (!question) {
      setNudge(attachedSources.length > 0 ? 'Ask a question about the attached context' : 'Type a question first')
      return
    }
    const citationSet = effectiveItems.slice(0, 3)
    const limited = countLimitedCitationSources(citationSet)
    const userMessage: AskMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
      scopeLabel: effectiveScopeLabel,
    }
    const loadingMessage: AskMessage = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      text: attachedSources.length > 0 ? 'Reading attached context...' : 'Searching your Brain...',
      loading: true,
      scopeLabel: effectiveScopeLabel,
    }
    setMessages((current) => [...current, userMessage, loadingMessage])
    setInput('')
    setIsLoading(true)
    window.setTimeout(() => {
      setMessages((current) => [
        ...current.filter((message) => message.id !== loadingMessage.id),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: createAnswerText(question),
          citations: citationSet,
          warning: limited > 0 ? `${limited} cited source${limited === 1 ? '' : 's'} have limited readable text.` : undefined,
          scopeLabel: effectiveScopeLabel,
        },
      ])
      setIsLoading(false)
    }, 700)
  }

  const saveAndAttachLink = () => {
    if (!pasteLinkValue.trim()) return
    setPasteStatus('saving')
    window.setTimeout(() => {
      setPasteStatus('saved')
      if (pasteOutcome === 'full') {
        upsertAttachment({
          id: `link-full-${pasteLinkValue}`,
          title: attachTitleFromUrl(pasteLinkValue),
          sourceType: 'Web capture',
          capturedVia: 'Android share',
          quality: 'Full text',
          snippet: 'Simulated full-text capture result for this prototype.',
          simulated: true,
        })
      }
      if (pasteOutcome === 'metadata') {
        upsertAttachment({
          id: `link-metadata-${pasteLinkValue}`,
          title: attachTitleFromUrl(pasteLinkValue),
          sourceType: 'Web capture',
          capturedVia: 'Android share',
          quality: 'Metadata only',
          snippet: 'Simulated metadata-only result. Add text before trusting answers from this source.',
          simulated: true,
        })
      }
    }, 650)
  }

  const attachDuplicateExisting = () => {
    const existing = sourceById('4')
    if (existing) upsertAttachment(existing)
    setActiveSheet(null)
    setPasteStatus('idle')
    setPasteLinkValue('')
  }

  const keepDuplicateLink = () => {
    upsertAttachment({
      id: `link-duplicate-${pasteLinkValue}`,
      title: `${attachTitleFromUrl(pasteLinkValue)} copy`,
      sourceType: 'Web capture',
      capturedVia: 'Android share',
      quality: 'Preview only',
      snippet: 'Prototype duplicate check kept a separate preview-only copy.',
      simulated: true,
    })
    setActiveSheet(null)
    setPasteStatus('idle')
    setPasteLinkValue('')
  }

  const saveNote = () => {
    if (!noteBody.trim()) return
    upsertAttachment({
      id: `note-${Date.now()}`,
      title: noteTitle.trim() || 'Untitled note',
      sourceType: 'Manual note',
      capturedVia: 'Android note',
      quality: 'Full text',
      snippet: noteBody.trim(),
      simulated: true,
    })
    setNoteTitle('')
    setNoteBody('')
    setActiveSheet(null)
    setNudge('Prototype note saved and attached')
  }

  const loadConversation = (item: HistoryItem) => {
    const restoredAttachments = item.attachedIds.map(sourceById).filter(Boolean) as CitationSource[]
    const citations = item.citationIds.map(sourceById).filter(Boolean) as CitationSource[]
    setAttachedSources(restoredAttachments)
    setMessages([
      { id: `${item.id}-q`, role: 'user', text: item.question, scopeLabel: item.scopeLabel },
      {
        id: `${item.id}-a`,
        role: 'assistant',
        text: item.answer,
        citations,
        warning: item.warning ? 'This restored conversation used limited readable sources.' : undefined,
        scopeLabel: item.scopeLabel,
      },
    ])
    setLoadedConversationId(item.id)
    setActiveSheet(null)
    setNudge(null)
  }

  const renderMessage = (message: AskMessage) => {
    if (message.role === 'user') {
      return (
        <div key={message.id} className="ml-auto max-w-[86%] rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <p className="text-[14px] leading-6">{message.text}</p>
          {message.scopeLabel && <p className="mt-2 text-[11px] text-slate-300">{message.scopeLabel}</p>}
        </div>
      )
    }
    return (
      <div key={message.id} className="max-w-[92%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-50 text-violet-700"><Sparkles size={15} /></span>
          <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">AI Brain</span>
          {message.loading && <Loader2 size={15} className="animate-spin text-violet-500" />}
        </div>
        <p className="text-[14px] leading-6 text-slate-800">{message.text}</p>
        {message.warning && <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-900"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{message.warning}</div>}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Citations</p>
            {message.citations.map((item, index) => (
              <button key={`${message.id}-${item.id}`} onClick={() => item.simulated ? setNudge('Prototype source attached for this Ask session') : navigate(`/item/${item.id}`)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left active:scale-[0.98] transition-transform">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">{index + 1}</span>
                <span className="text-[13px] font-bold text-slate-900">{item.title}</span>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge color={qualityColor(item.quality)} variant="subtle">{item.quality}</Badge>
                  {item.simulated && <Badge color="slate" variant="subtle">Prototype</Badge>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAttachedChips = () => {
    if (attachedSources.length === 0) return null
    const visible = attachedSources.slice(0, 2)
    const overflow = attachedSources.length - visible.length
    return (
      <div className="mb-2 flex items-center gap-2 overflow-hidden">
        {visible.map((source) => (
          <span key={source.id} className="inline-flex max-w-[145px] items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[12px] font-semibold text-violet-900">
            <span className="truncate">{source.title}</span>
            <button aria-label="Remove attached source" onClick={() => removeAttachment(source.id)} className="grid h-4 w-4 place-items-center rounded-full bg-white text-violet-700"><X size={11} /></button>
          </span>
        ))}
        {overflow > 0 && <button onClick={() => setActiveSheet('attachedSources')} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-bold text-slate-700">+{overflow}</button>}
      </div>
    )
  }

  const renderSheet = () => {
    if (!activeSheet) return null
    const close = () => setActiveSheet(null)
    const shell = (children: React.ReactNode) => (
      <div className="absolute inset-0 z-50 flex items-end bg-black/30" onClick={close}>
        <div className="max-h-[86%] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      </div>
    )
    const nestedHeader = (title: string, backTo: Sheet = 'addContext') => (
      <div className="mb-4 flex items-center justify-between gap-3">
        <button aria-label="Back to context options" onClick={() => setActiveSheet(backTo)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><ArrowLeft size={18} /></button>
        <h2 className="flex-1 text-center text-[18px] font-bold text-slate-900">{title}</h2>
        <button aria-label="Close sheet" onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
      </div>
    )

    if (activeSheet === 'addContext') {
      return shell(
        <>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900">Add context</h2>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">Attached context becomes the source set for your next answer.</p>
            </div>
            <button aria-label="Close sheet" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <ButtonRow icon={<BookOpen size={20} />} title="Attach saved item" body="Pick one or more Library items to ask against." onClick={() => setActiveSheet('attachPicker')} />
            <ButtonRow icon={<Link2 size={20} />} title="Paste link" body="Prototype a new captured source from a URL." onClick={() => { setPasteStatus('idle'); setActiveSheet('pasteLink') }} />
            <ButtonRow icon={<StickyNote size={20} />} title="Write note" body="Attach a manual note as temporary context." onClick={() => setActiveSheet('writeNote')} />
          </div>
        </>
      )
    }

    if (activeSheet === 'attachPicker') {
      return shell(
        <>
          {nestedHeader('Attach saved item')}
          <div className="relative mb-3">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={attachQuery} onChange={(event) => setAttachQuery(event.target.value)} placeholder="Search saved items" className="w-full rounded-xl bg-slate-100 py-3 pl-10 pr-3 text-[15px] outline-none" />
          </div>
          <div className="space-y-2 pb-4">
            {attachableSources.map((source) => {
              const selected = selectedAttachIds.includes(source.id)
              return (
                <button key={source.id} onClick={() => toggleAttachSelection(source.id)} className={`w-full rounded-xl border p-3 text-left ${selected ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">{selected ? <CheckCircle2 size={20} className="text-violet-600" /> : <Circle size={20} className="text-slate-300" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold leading-5 text-slate-900">{source.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge color={qualityColor(source.quality)} variant="subtle">{source.quality}</Badge>
                        <span className="text-[11px] text-slate-500">{source.sourceType} / Via {source.capturedVia}</span>
                      </span>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          <button aria-label="Attach selected sources" onClick={attachSelectedSources} disabled={selectedAttachIds.length === 0} className={`w-full rounded-xl py-3 text-[15px] font-bold ${selectedAttachIds.length === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white'}`}>
            Attach selected {selectedAttachIds.length > 0 ? `(${selectedAttachIds.length})` : ''}
          </button>
        </>
      )
    }

    if (activeSheet === 'pasteLink') {
      const hasValue = pasteLinkValue.trim().length > 0
      return shell(
        <>
          {nestedHeader('Paste link')}
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] font-semibold text-slate-600">Simulated capture result</div>
          <input value={pasteLinkValue} onChange={(event) => { setPasteLinkValue(event.target.value); setPasteStatus('idle') }} placeholder="https://example.com/article" className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-violet-500" />
          <div className="mb-4 grid grid-cols-3 gap-2">
            {([
              ['full', 'Full text'],
              ['metadata', 'Metadata only'],
              ['duplicate', 'Duplicate'],
            ] as [PasteOutcome, string][]).map(([value, label]) => (
              <button key={value} onClick={() => { setPasteOutcome(value); setPasteStatus('idle') }} className={`min-h-10 rounded-xl border px-2 text-[12px] font-bold ${pasteOutcome === value ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>{label}</button>
            ))}
          </div>
          {pasteStatus === 'saving' && <div className="mb-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 text-[13px] font-semibold text-violet-900"><Loader2 size={15} className="animate-spin" /> Saving and reading source...</div>}
          {pasteStatus === 'saved' && pasteOutcome !== 'duplicate' && <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-[13px] leading-5 text-teal-900"><b>Attached to this question.</b> {pasteOutcome === 'metadata' ? 'Metadata-only result. Add text before relying on it.' : 'Full-text prototype result is ready for Ask.'}{pasteOutcome === 'metadata' && <button className="mt-2 block rounded-lg border border-teal-300 bg-white px-3 py-2 text-[12px] font-bold text-teal-900">Add text</button>}</div>}
          {pasteStatus === 'saved' && pasteOutcome === 'duplicate' && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900"><b>Prototype duplicate check.</b> This looks similar to an item already saved.<div className="mt-3 grid grid-cols-2 gap-2"><button onClick={attachDuplicateExisting} className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-bold text-white">Attach existing</button><button onClick={keepDuplicateLink} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[12px] font-bold text-amber-900">Keep both</button></div></div>}
          <button aria-label="Save and attach link" onClick={saveAndAttachLink} disabled={!hasValue || pasteStatus === 'saving'} className={`w-full rounded-xl py-3 text-[15px] font-bold ${hasValue && pasteStatus !== 'saving' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>Save and attach</button>
        </>
      )
    }

    if (activeSheet === 'writeNote') {
      const canSave = noteBody.trim().length > 0
      return shell(
        <>
          {nestedHeader('Write note')}
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] font-semibold text-slate-600">Simulated note save</div>
          <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Optional title" className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-violet-500" />
          <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Write or paste a note..." className="mb-3 min-h-32 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-violet-500" />
          <button aria-label="Save and attach note" onClick={saveNote} disabled={!canSave} className={`w-full rounded-xl py-3 text-[15px] font-bold ${canSave ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>Save and attach note</button>
        </>
      )
    }

    if (activeSheet === 'attachedSources') {
      return shell(
        <>
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-[20px] font-bold text-slate-900">Attached sources</h2><button aria-label="Close sheet" onClick={close} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button></div>
          <div className="space-y-2">
            {attachedSources.map((source) => <div key={source.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"><FileText size={17} className="mt-0.5 text-slate-400" /><div className="min-w-0 flex-1"><p className="text-[14px] font-bold text-slate-900">{source.title}</p><div className="mt-1 flex flex-wrap gap-2"><Badge color={qualityColor(source.quality)} variant="subtle">{source.quality}</Badge>{source.simulated && <Badge color="slate" variant="subtle">Prototype</Badge>}</div></div><button aria-label="Remove attached source" onClick={() => removeAttachment(source.id)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><X size={15} /></button></div>)}
          </div>
        </>
      )
    }

    return shell(
      <>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-slate-900">Ask history</h2>
            <p className="mt-1 text-[13px] text-slate-500">Past conversations restore scope, sources, and warnings.</p>
          </div>
          <button aria-label="Close sheet" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-2">
          {sampleHistory.map((item) => (
            <button key={item.id} onClick={() => loadConversation(item)} className={`w-full rounded-xl border p-3 text-left ${loadedConversationId === item.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[14px] font-bold leading-5 text-slate-900">{item.title}</p><p className="mt-1 text-[12px] text-slate-500 line-clamp-2">{item.question}</p></div>
                <span className="shrink-0 text-[11px] font-semibold text-slate-400">{item.time}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Badge color="violet" variant="subtle">{item.scopeLabel.replace('Scope: ', '')}</Badge><span className="text-[11px] text-slate-500">{item.citationIds.length} citations</span>{item.warning && <Badge color="amber" variant="subtle">Limited</Badge>}</div>
            </button>
          ))}
          {conversations.slice(0, 2).map((item) => <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-slate-500"><b>{item.title}</b><br />Static preview from existing sample data.</div>)}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 relative">
      {nudge && <div className="absolute left-4 right-4 top-3 z-40 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-lg"><span>{nudge}</span><button onClick={() => setNudge(null)}><X size={14} /></button></div>}
      <div className={`flex-1 overflow-auto ${keyboardPreview ? 'pb-[18rem]' : 'pb-44'}`}>
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Ask</h1>
              <p className="mt-1 text-[13px] text-slate-500">Ground answers in saved sources.</p>
            </div>
            <div className="flex gap-2">
              <button aria-label="Preview keyboard layout" onClick={() => setKeyboardPreview((value) => !value)} className={`grid h-10 w-10 place-items-center rounded-xl border ${keyboardPreview ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700'}`}><Keyboard size={18} /></button>
              <button aria-label="Open conversation history" onClick={() => setActiveSheet('history')} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"><History size={18} /></button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="violet" variant="subtle">{effectiveScopeLabel}</Badge>
              <Badge color={effectiveLimited > 0 ? 'amber' : 'teal'} variant="subtle">{effectiveItems.length} sources</Badge>
              {loadedConversationId && <Badge color="slate" variant="subtle">Restored history</Badge>}
            </div>
            <p className="mt-2 text-[12px] leading-5 text-violet-950">{readableCount} readable sources. {effectiveLimited} limited. {attachedSources.length > 0 ? 'Attachments override the route scope for the next answer.' : 'Add context to narrow the next answer.'}</p>
            {routeLimited > 0 && attachedSources.length === 0 && <div className="mt-2 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[12px] leading-5 text-amber-900"><AlertTriangle size={14} className="mt-0.5 shrink-0" />This route scope includes limited sources.</div>}
          </div>
        </div>

        <div className="space-y-4 p-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Sparkles size={18} className="text-violet-600" /><span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">AI Brain</span></div>
              <h2 className="text-[19px] font-bold leading-tight text-slate-900">Ask across your saved knowledge</h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-600">Use the plus button to add a saved item, paste a link, or write a note before asking.</p>
              <div className="mt-4 space-y-2">
                {['Summarize the strongest sources in this scope', 'What needs better capture before I trust this?', 'Turn this into three follow-up questions'].map((suggestion) => (
                  <button key={suggestion} onClick={() => setInput(suggestion)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-[13px] font-semibold text-slate-800">{suggestion}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">{messages.map(renderMessage)}</div>
          )}
        </div>
      </div>

      <div className={`absolute left-0 right-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] ${keyboardPreview ? 'bottom-40' : 'bottom-16'}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ask AI Brain</p>
            <p className="text-[11px] text-slate-500 line-clamp-1">{effectiveScopeLabel}</p>
          </div>
          {effectiveLimited > 0 && <Badge color="amber" variant="subtle">Limited</Badge>}
        </div>
        {renderAttachedChips()}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pr-2">
          <button aria-label="Add context" onClick={() => setActiveSheet('addContext')} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-slate-800 shadow-sm"><Plus size={18} /></button>
          <input value={input} onChange={(event) => setInput(event.target.value)} onFocus={() => setKeyboardPreview(true)} placeholder="Ask a question..." className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-slate-900 outline-none placeholder:text-slate-400" />
          <button aria-label="Send question" onClick={() => handleSend()} disabled={isLoading} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isLoading ? 'bg-slate-200 text-slate-400' : input.trim() || attachedSources.length > 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{isLoading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
        </div>
        {nudge && <p className="mt-2 text-[12px] font-semibold text-amber-700">{nudge}</p>}
      </div>

      {keyboardPreview && <div className="absolute bottom-0 left-0 right-0 z-20 h-40 border-t border-slate-300 bg-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Keyboard preview</span><button onClick={() => setKeyboardPreview(false)} className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-700"><X size={14} /></button></div><div className="space-y-2">{['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m'].map((row) => <div key={row} className="flex justify-center gap-1">{row.split(' ').map((key) => <span key={key} className="grid h-8 min-w-7 place-items-center rounded-md bg-white px-1 text-[11px] font-bold text-slate-500 shadow-sm">{key}</span>)}</div>)}</div></div>}
      {!keyboardPreview && <MobileBottomNav />}
      {renderSheet()}
    </div>
  )
}
