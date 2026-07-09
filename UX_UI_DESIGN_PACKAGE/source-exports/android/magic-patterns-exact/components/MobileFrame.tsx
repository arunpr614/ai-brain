import React from 'react'
import { Wifi, Battery, Signal } from 'lucide-react'
interface MobileFrameProps {
  children: React.ReactNode
}
export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="relative w-full max-w-[390px] h-[844px] bg-white rounded-[40px] border-[12px] border-slate-900 shadow-2xl overflow-hidden flex flex-col">
      {/* Android Status Bar */}
      <div className="h-12 bg-white flex items-center justify-between px-6 shrink-0 z-50">
        <span className="text-[13px] font-medium text-slate-900">10:00</span>
        <div className="flex items-center gap-1.5 text-slate-900">
          <Wifi size={14} strokeWidth={2.5} />
          <Signal size={14} strokeWidth={2.5} />
          <Battery size={16} strokeWidth={2.5} />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-slate-50 relative flex flex-col">
        {children}
      </div>

      {/* Android Navigation Bar (Gesture Pill) */}
      <div className="h-6 bg-white shrink-0 flex items-center justify-center z-50">
        <div className="w-1/3 h-1 bg-slate-900 rounded-full" />
      </div>
    </div>
  )
}
