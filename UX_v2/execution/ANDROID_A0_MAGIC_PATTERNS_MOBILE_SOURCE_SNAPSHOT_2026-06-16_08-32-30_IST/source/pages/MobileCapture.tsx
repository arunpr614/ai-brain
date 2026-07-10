import React, { useState } from 'react'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { Badge, BadgeColor } from '../components/ui/Badge'
import {
  Link2,
  FileText,
  StickyNote,
  ClipboardPaste,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
} from 'lucide-react'
type Result =
  | 'none'
  | 'full'
  | 'metadata'
  | 'preview'
  | 'updated'
  | 'duplicate'
  | 'needsUpgrade'
export function MobileCapture() {
  const [result, setResult] = useState<Result>('none')
  return (
    <>
      <div className="flex flex-col h-full bg-white relative">
        <div className="flex-1 overflow-auto pb-20">
          <div className="bg-white border-b border-slate-200 p-5 pt-6 sticky top-0 z-10">
            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
              Capture
            </h1>
            <p className="text-[14px] text-slate-500 mt-1">
              Save content to your Brain.
            </p>
          </div>

          <div className="p-4 space-y-6">
            {/* Capture Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setResult('full')}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
                  <Link2 size={24} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">
                  Save URL
                </span>
              </button>

              <button
                onClick={() => setResult('full')}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <StickyNote size={24} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">
                  Write Note
                </span>
              </button>

              <button
                onClick={() => setResult('full')}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <FileText size={24} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">
                  Upload PDF
                </span>
              </button>

              <button
                onClick={() => setResult('full')}
                className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                  <ClipboardPaste size={24} />
                </div>
                <span className="text-[14px] font-semibold text-slate-900">
                  Paste Text
                </span>
              </button>
            </div>

            {/* Quick Paste Input */}
            <div className="relative">
              <input
                placeholder="Paste a link to save..."
                className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-lg text-[15px] focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
              <button
                onClick={() => setResult('full')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 text-white rounded-md flex items-center justify-center active:scale-95 transition-transform"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {result !== 'none' && (
              <CaptureResult result={result} setResult={setResult} />
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30">
          <MobileBottomNav />
        </div>
      </div>
    </>
  )
}
function CaptureResult({
  result,
  setResult,
}: {
  result: Exclude<Result, 'none'>
  setResult: (r: Result) => void
}) {
  const map: Record<
    Exclude<Result, 'none'>,
    {
      status: string
      quality?: string
      badgeColor?: BadgeColor
      icon: React.ReactNode
      body: string
      actions: {
        label: string
        primary?: boolean
        onClick?: () => void
      }[]
    }
  > = {
    full: {
      status: 'Saved successfully',
      quality: 'Full text',
      badgeColor: 'teal',
      icon: <CheckCircle2 size={24} className="text-teal-500" />,
      body: 'Complete text captured. Searchable and ready for Ask.',
      actions: [
        {
          label: 'Open item',
          primary: true,
        },
        {
          label: 'Ask this item',
        },
      ],
    },
    metadata: {
      status: 'Saved partially',
      quality: 'Metadata only',
      badgeColor: 'coral',
      icon: <AlertTriangle size={24} className="text-rose-500" />,
      body: 'Only basic metadata was available. Add a transcript or notes to make it useful in Ask.',
      actions: [
        {
          label: 'Add text',
          primary: true,
        },
        {
          label: 'Open item',
        },
      ],
    },
    preview: {
      status: 'Saved partially',
      quality: 'Preview only',
      badgeColor: 'amber',
      icon: <AlertTriangle size={24} className="text-amber-500" />,
      body: 'Only a preview was available. Paste the full text to upgrade.',
      actions: [
        {
          label: 'Paste text',
          primary: true,
        },
        {
          label: 'Open item',
        },
      ],
    },
    updated: {
      status: 'Updated existing',
      quality: 'Full text',
      badgeColor: 'lime',
      icon: <RefreshCw size={24} className="text-lime-500" />,
      body: 'Your existing item now has full text. No duplicate was created.',
      actions: [
        {
          label: 'Open item',
          primary: true,
        },
      ],
    },
    duplicate: {
      status: 'Duplicate candidate',
      icon: <Copy size={24} className="text-slate-500" />,
      body: 'This looks like an item you already saved. Keep both, or merge.',
      actions: [
        {
          label: 'Merge',
          primary: true,
        },
        {
          label: 'Keep both',
        },
      ],
    },
    needsUpgrade: {
      status: 'Saved with issues',
      quality: 'Needs upgrade',
      badgeColor: 'ruby',
      icon: <AlertTriangle size={24} className="text-red-500" />,
      body: 'Saved, but Ask cannot rely on it yet. Take one upgrade action to make it usable.',
      actions: [
        {
          label: 'Retry capture',
          primary: true,
        },
        {
          label: 'Paste text',
        },
      ],
    },
  }
  const r = map[result]
  return (
    <>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="shrink-0 mt-0.5">{r.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[16px] font-bold text-slate-900">
                {r.status}
              </span>
              {r.quality && (
                <Badge color={r.badgeColor || 'slate'} variant="subtle">
                  {r.quality}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <span>Substack</span>
              <span>•</span>
              <span>Via Android share</span>
            </div>
          </div>
        </div>

        <p className="text-[14px] text-slate-700 mb-5 leading-relaxed">
          {r.body}
        </p>

        <div className="flex gap-2 flex-wrap">
          {r.actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-lg text-[14px] font-semibold transition-transform active:scale-95 ${a.primary ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300 text-slate-700'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
