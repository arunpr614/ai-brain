import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Library, Plus, MessageSquare, MoreHorizontal } from 'lucide-react'

export function MobileBottomNav() {
  const location = useLocation()
  const path = location.pathname
  const useStandardCapture = path === '/ask' || path === '/capture'
  const isLibraryActive = path === '/library'
  const isCaptureActive = path === '/capture'
  const isAskActive = path === '/ask'
  const isMoreActive = path === '/more'

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 py-2 ${active ? 'text-slate-900' : 'text-slate-500'}`
  const iconClass = (active: boolean) => active ? 'text-slate-900' : 'text-slate-400'
  const labelClass = (active: boolean) =>
    `text-[10px] mt-1 ${active ? 'text-slate-900 font-medium' : 'text-slate-500'}`

  return (
    <nav className="relative h-16 bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-40">
      <Link to="/library" className={tabClass(isLibraryActive)} aria-label="Open Library">
        <Library size={22} className={iconClass(isLibraryActive)} />
        <span className={labelClass(isLibraryActive)}>Library</span>
      </Link>

      {useStandardCapture ? (
        <Link to="/capture" className={tabClass(isCaptureActive)} aria-label="Open Capture">
          <Plus size={23} className={iconClass(isCaptureActive)} />
          <span className={labelClass(isCaptureActive)}>Capture</span>
        </Link>
      ) : (
        <div className="flex flex-col items-center justify-end flex-1 h-full pb-1 relative">
          <Link
            to="/capture"
            aria-label="Open Capture"
            className="absolute -top-6 w-14 h-14 rounded-full bg-slate-900 shadow-lg flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-transform"
          >
            <Plus size={28} className="text-white" />
          </Link>
          <span className="text-[10px] mt-auto text-slate-500 font-medium">Capture</span>
        </div>
      )}

      <Link to="/ask" className={tabClass(isAskActive)} aria-label="Open Ask">
        <MessageSquare size={22} className={iconClass(isAskActive)} />
        <span className={labelClass(isAskActive)}>Ask</span>
      </Link>

      <Link to="/more" className={tabClass(isMoreActive)} aria-label="Open More">
        <MoreHorizontal size={22} className={iconClass(isMoreActive)} />
        <span className={labelClass(isMoreActive)}>More</span>
      </Link>
    </nav>
  )
}
