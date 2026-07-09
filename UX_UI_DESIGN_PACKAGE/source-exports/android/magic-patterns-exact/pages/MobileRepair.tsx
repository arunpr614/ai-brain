import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { getSourceById } from '../data/sources'
import {
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
export function MobileRepair() {
  const { id } = useParams<{
    id: string
  }>()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const source = getSourceById(id || '')
  const handleSave = () => {
    setShowConfirmation(true)
    setTimeout(() => {
      navigate(`/item/${id}`)
    }, 1500)
  }
  if (!source) {
    return <div className="p-4 text-slate-500">Item not found</div>
  }
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-auto pb-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 sticky top-0 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 mb-3 active:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-[20px] font-bold text-slate-900 leading-tight">
            Add transcript or notes
          </h1>
        </div>

        <div className="p-4 space-y-5">
          {/* Explanation */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <p className="text-[13px] text-amber-900 leading-relaxed">
              This item only has metadata. Add a transcript or your notes so it
              can be used in Ask.
            </p>
          </div>

          {/* Item Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-[15px] font-semibold text-slate-900 mb-1 line-clamp-2">
              {source.title}
            </p>
            <p className="text-[12px] text-slate-500">{source.sourceType}</p>
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-[13px] font-bold text-slate-900 mb-2 uppercase tracking-wider">
              Paste transcript or add notes
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-48 px-4 py-3 bg-white border border-slate-300 rounded-xl text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
              placeholder="Paste or type here..."
            />
          </div>

          {/* Confirmation Banner */}
          {showConfirmation && (
            <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={20} className="text-lime-600 shrink-0" />
              <p className="text-[14px] font-bold text-lime-900">
                Updated — your existing item now has full text
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl text-[15px] active:bg-slate-800 transition-colors disabled:opacity-50 disabled:active:bg-slate-900"
              onClick={handleSave}
              disabled={!text.trim() || showConfirmation}
            >
              Save update
            </button>
            <button className="w-full bg-white border border-slate-300 text-slate-700 font-semibold py-3.5 rounded-xl text-[15px] flex items-center justify-center gap-2 active:bg-slate-50 transition-colors">
              <ExternalLink size={18} />
              Open source
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <MobileBottomNav />
      </div>
    </div>
  )
}
