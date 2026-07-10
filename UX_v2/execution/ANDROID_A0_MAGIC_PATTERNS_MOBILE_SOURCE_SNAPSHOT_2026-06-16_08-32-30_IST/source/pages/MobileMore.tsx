import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileBottomNav } from '../components/MobileBottomNav'
import {
  Palette,
  Smartphone,
  MonitorSmartphone,
  RefreshCw,
  Download,
  Shield,
  Tags,
  Activity,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  User,
  Clock3,
  Trash2,
} from 'lucide-react'

type View = 'list' | 'privacy'

function ComingSoonPill() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
      Coming soon
    </span>
  )
}

function DisabledPrivacyRow({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-75">
      <div className="mb-2 flex items-start gap-3">
        <input
          type="checkbox"
          disabled
          aria-label={`${title} is coming soon`}
          className="mt-1 h-4 w-4 rounded border-slate-300 bg-slate-100 disabled:cursor-not-allowed"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-bold text-slate-700">{title}</p>
            <ComingSoonPill />
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function MobileMore() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('list')
  const groups = [
    {
      title: 'Preferences',
      items: [
        {
          icon: Palette,
          title: 'Appearance',
          color: 'text-violet-500',
          bg: 'bg-violet-50',
        },
        {
          icon: Tags,
          title: 'Tags & collections',
          color: 'text-blue-500',
          bg: 'bg-blue-50',
        },
      ],
    },
    {
      title: 'Sync & Devices',
      items: [
        {
          icon: Smartphone,
          title: 'Device pairing',
          color: 'text-teal-500',
          bg: 'bg-teal-50',
        },
        {
          icon: MonitorSmartphone,
          title: 'Connected devices',
          color: 'text-cyan-500',
          bg: 'bg-cyan-50',
        },
        {
          icon: RefreshCw,
          title: 'Offline sync',
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          icon: Download,
          title: 'Backup & export',
          color: 'text-amber-500',
          bg: 'bg-amber-50',
        },
        {
          icon: Shield,
          title: 'Data & privacy',
          color: 'text-rose-500',
          bg: 'bg-rose-50',
          action: () => setView('privacy'),
          subtitle: 'Roadmap controls',
        },
        {
          icon: Activity,
          title: 'Providers & model health',
          color: 'text-indigo-500',
          bg: 'bg-indigo-50',
        },
      ],
    },
  ]

  if (view === 'privacy') {
    return (
      <div className="flex flex-col h-full bg-slate-50 relative">
        <div className="flex-1 overflow-auto pb-20">
          <div className="bg-white border-b border-slate-200 px-4 pt-5 pb-4 sticky top-0 z-10">
            <button
              onClick={() => setView('list')}
              className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 active:text-slate-900"
            >
              <ChevronLeft size={17} />
              Settings
            </button>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
                  Data & privacy
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  Roadmap controls, not active settings.
                </p>
              </div>
              <ComingSoonPill />
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-700" />
              <div>
                <p className="text-[14px] font-bold text-amber-950">
                  Privacy features are coming soon
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-900">
                  End-to-end encryption, usage-sharing controls, crash-report controls,
                  and delete-all-data are not available in this prototype. The controls
                  below are disabled placeholders.
                </p>
              </div>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Privacy settings
                </h2>
                <ComingSoonPill />
              </div>
              <DisabledPrivacyRow
                title="Share anonymous usage data"
                description="Not active yet. This prototype does not provide a telemetry preference."
              />
              <DisabledPrivacyRow
                title="Crash reports"
                description="Not active yet. Crash-report sharing controls are planned, but this setting does not work today."
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Data storage
                </h2>
                <ComingSoonPill />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-75">
                <div className="mb-2 flex items-center gap-2">
                  <Shield size={17} className="text-slate-500" />
                  <p className="text-[14px] font-bold text-slate-700">
                    End-to-end encryption is not active yet
                  </p>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-500">
                  Do not treat this Memory as end-to-end encrypted. A future version
                  may add device-held keys, recovery handling, and encrypted sync.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Delete all data
                </h2>
                <ComingSoonPill />
              </div>
              <p className="mb-3 text-[13px] leading-relaxed text-slate-500">
                A verified destructive delete flow is planned. This action is disabled
                until confirmation, recovery warnings, and deletion behavior are implemented.
              </p>
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 text-[14px] font-bold text-rose-400 opacity-60"
              >
                <Trash2 size={16} />
                Delete everything
              </button>
            </section>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-30">
          <MobileBottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-auto pb-20">
        <div className="bg-white border-b border-slate-200 p-5 pt-6 sticky top-0 z-10">
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
        </div>

        <div className="p-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <User size={24} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-slate-900 truncate">
                Alex's Brain
              </p>
              <p className="text-[13px] text-slate-500 truncate">
                alex@example.com
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/needs-upgrade')}
            className="w-full bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[15px] font-bold text-rose-900 mb-0.5">
                Needs upgrade
              </p>
              <p className="text-[13px] text-rose-700">Review weak captures</p>
            </div>
            <ChevronRight size={20} className="text-rose-300" />
          </button>

          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  {group.title}
                </h2>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {group.items.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.title}
                        onClick={item.action}
                        className={`w-full text-left p-4 flex items-center gap-4 active:bg-slate-50 transition-colors ${index !== group.items.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center shrink-0`}
                        >
                          <Icon size={16} className={item.color} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block text-[12px] text-slate-500 truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
            <Clock3 size={18} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-[12px] leading-relaxed text-slate-500">
              Privacy controls are on the roadmap. Do not assume end-to-end encryption
              or telemetry controls are active in this prototype.
            </p>
          </div>

          <div className="pt-4 pb-8 text-center">
            <p className="text-[12px] text-slate-400 font-medium">
              AI Brain v1.0.0
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-30">
        <MobileBottomNav />
      </div>
    </div>
  )
}
