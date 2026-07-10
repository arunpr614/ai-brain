import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { getWeakSources } from '../data/sources'
export function MobileNeedsUpgrade() {
  const navigate = useNavigate()
  const weak = getWeakSources()
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-4 sticky top-0 z-10">
          <button
            onClick={() => navigate('/library')}
            className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 mb-3 active:text-slate-900"
          >
            <ArrowLeft size={16} />
            Library
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">
              Needs upgrade
            </h1>
            <span className="bg-rose-100 text-rose-700 text-[12px] font-bold px-2 py-0.5 rounded-full">
              {weak.length}
            </span>
          </div>
          <p className="text-[14px] text-slate-500 mt-1">
            Items that need text to be useful in Ask.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {weak.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/item/${s.id}`)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[15px] font-semibold text-slate-900 flex-1 line-clamp-2 leading-snug">
                  {s.title}
                </p>
                <Badge color="ruby" variant="subtle" className="shrink-0">
                  {s.quality}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <span className="font-medium">{s.sourceType}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <AlertTriangle size={12} />
                  {s.needsUpgradeReason}
                </span>
              </div>
            </button>
          ))}

          {weak.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-teal-500" />
              </div>
              <p className="text-[16px] font-bold text-slate-900 mb-1">
                All caught up!
              </p>
              <p className="text-[14px] text-slate-500">
                No items currently need upgrading.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <MobileBottomNav />
      </div>
    </div>
  )
}
