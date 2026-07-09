import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Drawer } from '../components/ui/Drawer'
import { Youtube, CheckCircle2, AlertTriangle } from 'lucide-react'
export function MobileShareCapture() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => navigate('/library'), 300)
  }
  return (
    <div className="flex flex-col h-full bg-slate-900/40 relative">
      <Drawer isOpen={isOpen} onClose={handleClose} position="bottom" size="md">
        <div className="bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

          <div className="p-6 overflow-auto">
            {/* Source Info */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <Youtube size={28} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-[16px] font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                  Designing calm software — conference keynote
                </p>
                <p className="text-[13px] text-slate-500">YouTube</p>
              </div>
            </div>

            {/* Status Banner */}
            <div className="flex items-center gap-2 p-3.5 bg-teal-50 border border-teal-100 rounded-xl mb-4">
              <CheckCircle2 size={20} className="text-teal-600 shrink-0" />
              <span className="text-[14px] font-semibold text-teal-900">
                Saved to library
              </span>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-y-2 text-[13px] mb-6">
              <div className="text-slate-500">Platform</div>
              <div className="text-slate-900 font-medium">YouTube</div>

              <div className="text-slate-500">Captured via</div>
              <div className="text-slate-900 font-medium">Android share</div>

              <div className="text-slate-500">Quality</div>
              <div>
                <Badge color="coral" variant="subtle">
                  Metadata only
                </Badge>
              </div>
            </div>

            {/* Recommended Action */}
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-rose-600" />
                <p className="text-[13px] font-bold text-rose-900">
                  Recommended next action
                </p>
              </div>
              <p className="text-[13px] text-rose-800 leading-relaxed pl-6">
                Add transcript or notes to use this item in Ask
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl text-[15px] active:bg-slate-800 transition-colors"
                onClick={() => navigate('/repair/2')}
              >
                Add text
              </button>
              <div className="flex gap-3">
                <button
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl text-[14px] active:bg-slate-50 transition-colors"
                  onClick={() => navigate('/item/2')}
                >
                  Open item
                </button>
                <button
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl text-[14px] active:bg-slate-50 transition-colors"
                  onClick={handleClose}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
