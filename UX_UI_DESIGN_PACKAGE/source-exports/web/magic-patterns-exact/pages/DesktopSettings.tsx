import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Separator } from '../components/ui/Separator'
import { Badge } from '../components/ui/Badge'
import {
  Lock,
  Smartphone,
  RefreshCw,
  Download,
  Shield,
  Activity,
  Palette,
  Tags,
  CheckCircle2,
  Trash2,
  Plus,
  X,
  AlertTriangle,
  Clock3,
} from 'lucide-react'

type Category =
  | 'access'
  | 'devices'
  | 'offline'
  | 'backup'
  | 'privacy'
  | 'health'
  | 'appearance'
  | 'tags'

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center rounded-chip border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
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
    <div className="flex items-start gap-3 rounded-card border border-line bg-canvas/60 p-4 opacity-75">
      <input
        type="checkbox"
        disabled
        aria-label={`${title} is coming soon`}
        className="mt-1 h-4 w-4 rounded-chip border-line-strong bg-line text-ink-300 disabled:cursor-not-allowed"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-sm font-bold text-ink-700">{title}</p>
          <ComingSoonBadge />
        </div>
        <p className="text-xs leading-relaxed text-ink-500">{description}</p>
      </div>
    </div>
  )
}

export function DesktopSettings() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState<Category>('privacy')
  const categories: {
    id: Category
    icon: React.ElementType
    title: string
    desc: string
  }[] = [
    {
      id: 'access',
      icon: Lock,
      title: 'Access',
      desc: 'PIN, session timeout',
    },
    {
      id: 'devices',
      icon: Smartphone,
      title: 'Devices',
      desc: 'Pairing, connected devices',
    },
    {
      id: 'offline',
      icon: RefreshCw,
      title: 'Offline sync',
      desc: 'Storage limits, cache',
    },
    {
      id: 'backup',
      icon: Download,
      title: 'Backup & export',
      desc: 'Download your data',
    },
    {
      id: 'privacy',
      icon: Shield,
      title: 'Data & privacy',
      desc: 'Roadmap controls',
    },
    {
      id: 'health',
      icon: Activity,
      title: 'Providers',
      desc: 'Model health, API status',
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Appearance',
      desc: 'Theme, text size',
    },
    {
      id: 'tags',
      icon: Tags,
      title: 'Tags & collections',
      desc: 'Manage organization',
    },
  ]
  return (
    <div className="h-full flex bg-canvas overflow-hidden">
      <div className="w-72 bg-panel border-r border-line flex flex-col shrink-0">
        <div className="p-6 border-b border-line">
          <h1 className="text-2xl font-bold text-ink">Settings</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {categories.map((c) => {
            const Icon = c.icon
            const isActive = activeCategory === c.id
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`w-full text-left p-3 rounded-card flex items-center gap-3 transition-colors ${isActive ? 'bg-canvas border border-line shadow-sm' : 'border border-transparent hover:bg-canvas/50'}`}
              >
                <div
                  className={`w-8 h-8 rounded-chip flex items-center justify-center shrink-0 ${isActive ? 'bg-ink text-white' : 'bg-canvas text-ink-500'}`}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold truncate ${isActive ? 'text-ink' : 'text-ink-700'}`}
                  >
                    {c.title}
                  </p>
                  <p className="text-xs text-ink-500 truncate">{c.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {activeCategory === 'access' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">Access</h2>
                <p className="text-sm text-ink-500 mb-6">
                  Manage how you unlock your AI Memory.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">
                      Change PIN
                    </h3>
                    <div className="space-y-3 max-w-sm">
                      <Input type="password" placeholder="Current PIN" />
                      <Input type="password" placeholder="New PIN" />
                      <Input type="password" placeholder="Confirm new PIN" />
                      <Button>Update PIN</Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">
                      Session Timeout
                    </h3>
                    <p className="text-sm text-ink-600 mb-3">
                      Require PIN after inactivity.
                    </p>
                    <select className="h-10 px-3 pr-8 border border-line-strong rounded-chip bg-panel text-sm text-ink focus:outline-none focus:ring-2 focus:ring-azure-500 w-full max-w-sm">
                      <option>15 minutes</option>
                      <option>1 hour</option>
                      <option>4 hours</option>
                      <option>Never</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'devices' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">Devices</h2>
                <p className="text-sm text-ink-500 mb-6">
                  Manage devices connected to this Memory.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Pair a new device
                      </h3>
                      <p className="text-sm text-ink-600">
                        Connect your Android app via QR code.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/pair')}>
                      Pair Device
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold text-ink mb-4">
                      Connected Devices
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border border-line rounded-chip bg-canvas">
                        <div className="flex items-center gap-3">
                          <Smartphone size={20} className="text-ink-500" />
                          <div>
                            <p className="text-sm font-bold text-ink">
                              Pixel 8 Pro
                            </p>
                            <p className="text-xs text-ink-500">
                              Last synced: 2 hours ago
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="small"
                          leftIcon={<Trash2 size={14} />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'offline' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">
                  Offline Sync
                </h2>
                <p className="text-sm text-ink-500 mb-6">
                  Control what's available when you're offline.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">
                      Sync Settings
                    </h3>
                    <div className="space-y-4">
                      {['Sync full-text items', 'Sync transcripts', 'Sync PDFs'].map(
                        (label, index) => (
                          <label
                            key={label}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              defaultChecked={index < 2}
                              className="w-4 h-4 rounded-chip border-line-strong text-azure-500 focus:ring-azure-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {label}
                              </p>
                              <p className="text-xs text-ink-500">
                                {index === 2
                                  ? 'Download PDF files when available'
                                  : 'Download readable content for offline use'}
                              </p>
                            </div>
                          </label>
                        ),
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">Storage</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-600">Used</span>
                        <span className="font-medium text-ink">
                          247 MB of 2 GB
                        </span>
                      </div>
                      <div className="w-full bg-line rounded-full h-2">
                        <div className="bg-azure-500 h-2 rounded-full w-[12%]"></div>
                      </div>
                      <Button variant="secondary" size="small">
                        Clear Cache
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'backup' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">
                  Backup & Export
                </h2>
                <p className="text-sm text-ink-500 mb-6">
                  Download your data or create a backup.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">
                      Export All Data
                    </h3>
                    <p className="text-sm text-ink-600 mb-4">
                      Download a complete archive of your Memory including all
                      items, tags, and collections.
                    </p>
                    <Button leftIcon={<Download size={16} />}>
                      Export as ZIP
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold text-ink mb-2">
                      Automatic Backups
                    </h3>
                    <p className="text-sm text-ink-600 mb-3">
                      Automatically back up your data to your device.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded-chip border-line-strong text-azure-500 focus:ring-azure-500"
                      />
                      <span className="text-sm text-ink">
                        Enable daily backups
                      </span>
                    </label>
                    <p className="text-xs text-ink-500 mt-2 ml-7">
                      Last backup: Today at 3:42 AM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'privacy' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-ink">
                      Data & Privacy
                    </h2>
                    <Badge variant="amber" style="soft">
                      Roadmap
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-500">
                    These privacy controls are shown for product direction only.
                    They are not active yet.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-card p-4 mb-6 flex gap-3">
                  <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-950 mb-1">
                      Privacy features are coming soon
                    </p>
                    <p className="text-sm text-amber-900 leading-relaxed">
                      End-to-end encryption, anonymous usage sharing controls,
                      crash-report controls, and in-app delete-all-data controls
                      are not available in this prototype. Disabled controls below
                      are roadmap placeholders.
                    </p>
                  </div>
                </div>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-bold text-ink">
                        Privacy Settings
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <div className="space-y-3">
                      <DisabledPrivacyRow
                        title="Share anonymous usage data"
                        description="Not active yet. AI Memory is not offering a telemetry preference in this prototype."
                      />
                      <DisabledPrivacyRow
                        title="Crash reports"
                        description="Not active yet. Crash-report sharing controls are planned, but this setting does not work today."
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-bold text-ink">
                        Data Storage
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <div className="rounded-card border border-line bg-canvas/60 p-4 opacity-75">
                      <div className="mb-2 flex items-center gap-2">
                        <Shield size={16} className="text-ink-500" />
                        <p className="text-sm font-bold text-ink-700">
                          End-to-end encryption is not active yet
                        </p>
                        <span className="rounded-chip border border-line bg-panel px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                          Disabled
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-ink-500">
                        Do not treat this Memory as end-to-end encrypted. A future
                        version may add device-held keys, recovery handling, and
                        encrypted sync, but those capabilities are not available now.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-sm font-bold text-ink">
                        Delete All Data
                      </h3>
                      <ComingSoonBadge />
                    </div>
                    <p className="text-sm text-ink-600 mb-4">
                      A verified delete-all-data flow is planned. This button is
                      disabled until the destructive action and confirmation flow
                      are implemented.
                    </p>
                    <Button
                      variant="danger"
                      leftIcon={<Trash2 size={16} />}
                      disabled
                      className="opacity-60"
                    >
                      Delete Everything
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'health' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">
                  Providers & Health
                </h2>
                <p className="text-sm text-ink-500 mb-6">
                  Status of the AI models powering your Memory.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  {['Answering Model: Healthy', 'Extraction Model: Healthy'].map(
                    (label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between p-4 border border-lime-200 bg-lime-50 rounded-chip"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={24} className="text-lime-600" />
                          <div>
                            <p className="text-sm font-bold text-lime-900">
                              {label}
                            </p>
                            <p className="text-xs text-lime-700">
                              Operational in the current prototype.
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  <Separator />

                  <div>
                    <h3 className="text-sm font-bold text-ink mb-3">
                      Response Time
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-ink-600">Ask queries</span>
                        <span className="font-medium text-ink">
                          ~2.3s average
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-600">Content extraction</span>
                        <span className="font-medium text-ink">
                          ~4.1s average
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'appearance' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">Appearance</h2>
                <p className="text-sm text-ink-500 mb-6">
                  Customize how AI Memory looks and feels.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  {['Theme', 'Reading Size', 'Density'].map((label) => (
                    <div key={label}>
                      <h3 className="text-sm font-bold text-ink mb-2">{label}</h3>
                      <p className="text-sm text-ink-600 mb-3">
                        Adjust your preferred {label.toLowerCase()}.
                      </p>
                      <select className="h-10 px-3 pr-8 border border-line-strong rounded-chip bg-panel text-sm text-ink focus:outline-none focus:ring-2 focus:ring-azure-500 w-full max-w-sm">
                        <option>Default</option>
                        <option>Comfortable</option>
                        <option>Compact</option>
                      </select>
                      {label !== 'Density' && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'tags' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-ink mb-1">
                  Tags & Collections
                </h2>
                <p className="text-sm text-ink-500 mb-6">
                  Organize your saved items with tags and collections.
                </p>

                <div className="bg-panel border border-line rounded-card p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-ink">Your Tags</h3>
                      <Button size="small" leftIcon={<Plus size={14} />}>
                        New Tag
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {[
                        'design',
                        'research',
                        'product',
                        'engineering',
                        'reading-list',
                      ].map((tag) => (
                        <div
                          key={tag}
                          className="flex items-center justify-between p-3 border border-line rounded-chip bg-canvas hover:bg-panel transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="neutral" style="soft">
                              {tag}
                            </Badge>
                            <span className="text-xs text-ink-500">
                              12 items
                            </span>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-ruby-600 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-ink">
                        Collections
                      </h3>
                      <Button size="small" leftIcon={<Plus size={14} />}>
                        New Collection
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {[
                        'Weekend Reading',
                        'Work Projects',
                        'Learning Resources',
                      ].map((collection) => (
                        <div
                          key={collection}
                          className="flex items-center justify-between p-3 border border-line rounded-chip bg-canvas hover:bg-panel transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="magenta" style="soft">
                              {collection}
                            </Badge>
                            <span className="text-xs text-ink-500">
                              8 items
                            </span>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 p-1 text-ink-400 hover:text-ruby-600 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
