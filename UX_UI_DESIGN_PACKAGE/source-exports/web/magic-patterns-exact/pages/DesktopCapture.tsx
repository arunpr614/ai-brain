import React, { useState } from 'react'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Link2, FileText, StickyNote, UploadCloud, X } from 'lucide-react'
type CaptureMode = 'url' | 'pdf' | 'note'
type Result =
  | 'full'
  | 'metadata'
  | 'preview'
  | 'updated'
  | 'duplicate'
  | 'needsUpgrade'
  | 'none'
export function DesktopCapture() {
  const [mode, setMode] = useState<CaptureMode>('url')
  const [result, setResult] = useState<Result>('none')
  const [noteContent, setNoteContent] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const handleCapture = () => {
    // Cycle through results for demo
    const results: Result[] = [
      'full',
      'metadata',
      'preview',
      'updated',
      'duplicate',
      'needsUpgrade',
    ]
    const currentIndex = results.indexOf(result)
    const nextResult = results[(currentIndex + 1) % results.length]
    setResult(nextResult)
  }
  return (
    <div className="h-full overflow-auto bg-canvas">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-ink mb-6">Capture</h1>

        <div className="bg-panel border border-line rounded-card shadow-panel overflow-hidden">
          {/* Mode Switcher */}
          <div className="flex border-b border-line bg-canvas">
            <button
              onClick={() => setMode('url')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'url' ? 'border-ink text-ink bg-panel' : 'border-transparent text-ink-500 hover:text-ink hover:bg-panel/50'}`}
            >
              <Link2 size={16} />
              URL
            </button>
            <button
              onClick={() => setMode('pdf')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'pdf' ? 'border-ink text-ink bg-panel' : 'border-transparent text-ink-500 hover:text-ink hover:bg-panel/50'}`}
            >
              <FileText size={16} />
              PDF Upload
            </button>
            <button
              onClick={() => setMode('note')}
              className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${mode === 'note' ? 'border-ink text-ink bg-panel' : 'border-transparent text-ink-500 hover:text-ink hover:bg-panel/50'}`}
            >
              <StickyNote size={16} />
              Note
            </button>
          </div>

          <div className="p-6">
            {mode === 'url' && (
              <div className="space-y-4">
                <p className="text-sm text-ink-600">
                  Paste a link to an article, video, or post. AI Memory will
                  extract the content.
                </p>
                <Input
                  placeholder="https://..."
                  startAdornment={<Link2 size={16} />}
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
                <Button onClick={handleCapture} disabled={!urlValue.trim()}>
                  Save to library
                </Button>
              </div>
            )}

            {mode === 'pdf' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-line-strong rounded-card p-8 flex flex-col items-center justify-center text-center hover:bg-canvas transition-colors cursor-pointer">
                  <UploadCloud size={32} className="text-ink-400 mb-3" />
                  <p className="text-sm font-medium text-ink mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-ink-500">PDF files up to 50MB</p>
                </div>
                <Button onClick={handleCapture}>Upload PDF</Button>
              </div>
            )}

            {mode === 'note' && (
              <div className="space-y-4">
                <Input placeholder="Note title (optional)" />
                <textarea
                  className="w-full h-32 px-3 py-2 border border-line-strong rounded-chip bg-panel text-ink placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-azure-500 resize-none text-sm"
                  placeholder="Write your note here..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <Button onClick={handleCapture} disabled={!noteContent.trim()}>
                  Save Note
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Result panel */}
        {result !== 'none' && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CaptureResult
              result={result}
              onDismiss={() => setResult('none')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
function CaptureResult({
  result,
  onDismiss,
}: {
  result: Result
  onDismiss: () => void
}) {
  const map: Record<
    Exclude<Result, 'none'>,
    {
      status: string
      quality?: string
      badgeVariant: 'teal' | 'coral' | 'amber' | 'lime' | 'ruby' | 'neutral'
      body: string
      actions: string[]
    }
  > = {
    full: {
      status: 'Saved',
      quality: 'Full text',
      badgeVariant: 'teal',
      body: 'Complete text captured. This item is searchable and ready for Ask.',
      actions: ['Open item', 'Ask this item'],
    },
    metadata: {
      status: 'Saved',
      quality: 'Metadata only',
      badgeVariant: 'coral',
      body: 'Only basic metadata was available. Add a transcript or notes to make it useful in Ask.',
      actions: ['Add transcript / notes', 'Open item'],
    },
    preview: {
      status: 'Saved',
      quality: 'Preview only',
      badgeVariant: 'amber',
      body: 'Only a preview was available (full article may need a subscription). Paste the full text to upgrade.',
      actions: ['Paste text', 'Open item'],
    },
    updated: {
      status: 'Updated',
      quality: 'Full text',
      badgeVariant: 'lime',
      body: 'Your existing item now has full text. No duplicate was created.',
      actions: ['Open item'],
    },
    duplicate: {
      status: 'Duplicate candidate',
      badgeVariant: 'neutral',
      body: 'This looks like an item you already saved. Keep both, or merge into the existing item.',
      actions: ['Merge into existing', 'Keep both'],
    },
    needsUpgrade: {
      status: 'Saved',
      quality: 'Needs upgrade',
      badgeVariant: 'ruby',
      body: 'This item was saved, but Ask cannot rely on it yet. Retry capture or paste the full text to make it usable.',
      actions: ['Retry capture', 'Paste text', 'Open item'],
    },
  }
  const r = map[result as Exclude<Result, 'none'>]
  return (
    <div
      className={`bg-panel border-2 rounded-card p-5 relative ${r.badgeVariant === 'neutral' ? 'border-line-strong' : `border-${r.badgeVariant}-200`}`}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 text-ink-400 hover:text-ink rounded-chip hover:bg-canvas transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-bold text-ink">{r.status}</span>
        {r.quality && (
          <Badge variant={r.badgeVariant} style="soft">
            {r.quality}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-x-3 gap-y-1 mb-3 flex-wrap text-xs text-ink-500">
        <span className="font-medium text-ink-700">Substack</span>
        <span className="text-line-strong">•</span>
        <span>Captured via Web capture</span>
      </div>
      <p className="text-sm text-ink-700 mb-4">{r.body}</p>
      <div className="flex gap-2 flex-wrap">
        {r.actions.map((a, i) => (
          <Button
            key={a}
            size="small"
            variant={i === 0 ? 'primary' : 'secondary'}
          >
            {a}
          </Button>
        ))}
      </div>
    </div>
  )
}
