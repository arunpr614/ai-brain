import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { MobileBottomNav } from '../components/MobileBottomNav'
import { WifiOff, AlertCircle, Search, MessageSquareOff } from 'lucide-react'
import { sources } from '../data/sources'
export function MobileOffline() {
  const navigate = useNavigate()
  const offlineItems = sources.filter((s) => s.offlineAvailable)
  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-auto pb-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-5 pt-6 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <WifiOff size={16} className="text-slate-600" />
            </div>
            <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">
              Offline Mode
            </h1>
          </div>
        </div>

        {/* Server Unreachable Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-amber-900 mb-1">
                Server unreachable
              </p>
              <p className="text-[13px] text-amber-800 leading-relaxed">
                You can still read offline items. Ask is disabled because it
                needs a connection.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Offline Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                Available offline ({offlineItems.length})
              </h2>
              <button className="text-slate-400 p-1">
                <Search size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {offlineItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[15px] font-semibold text-slate-900 flex-1 line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    <Badge color="teal" variant="subtle" className="shrink-0">
                      {item.quality}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-slate-500 font-medium">
                    {item.sourceType}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Disabled Ask */}
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-3">
              Ask (unavailable)
            </h2>
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquareOff size={20} className="text-slate-500" />
              </div>
              <p className="text-[14px] font-medium text-slate-900 mb-1">
                Ask is offline
              </p>
              <p className="text-[13px] text-slate-500">
                Reconnect to the internet to ask questions about your Brain.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <MobileBottomNav />
      </div>
    </div>
  )
}
