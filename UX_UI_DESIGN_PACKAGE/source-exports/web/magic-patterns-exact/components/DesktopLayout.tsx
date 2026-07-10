import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from './ui/Badge'
import { getWeakSources } from '../data/sources'
import {
  Library as LibraryIcon,
  AlertTriangle,
  MessageSquare,
  Plus,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Smartphone,
} from 'lucide-react'
interface DesktopLayoutProps {
  children: React.ReactNode
}
export function DesktopLayout({ children }: DesktopLayoutProps) {
  const location = useLocation()
  const weakCount = getWeakSources().length
  const isItemDetail = location.pathname.startsWith('/item/')
  const [collapsed, setCollapsed] = useState(isItemDetail)
  const navItems = [
    {
      path: '/library',
      label: 'Library',
      icon: LibraryIcon,
    },
    {
      path: '/needs-upgrade',
      label: 'Needs Upgrade',
      icon: AlertTriangle,
      badge: weakCount,
      badgeVariant: 'ruby' as const,
    },
    {
      path: '/ask',
      label: 'Ask',
      icon: MessageSquare,
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: SettingsIcon,
    },
  ]
  return (
    <div className="flex h-screen bg-canvas text-ink">
      <nav
        className={`${collapsed ? 'w-16' : 'w-60'} bg-panel border-r border-line flex flex-col transition-[width] duration-200 z-10 relative`}
      >
        <div
          className={`border-b border-line ${collapsed ? 'p-3 flex justify-center' : 'p-4'}`}
        >
          {collapsed ? (
            <div className="w-8 h-8 bg-ink text-white rounded-chip flex items-center justify-center font-bold text-sm">
              AI
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-ink text-white rounded-chip flex items-center justify-center font-bold text-sm">
                AI
              </div>
              <div>
                <h1 className="text-sm font-bold text-ink leading-tight">
                  AI Memory
                </h1>
                <p className="text-xs text-ink-500">Personal Knowledge</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <div
            className={
              collapsed ? 'px-2 pb-3 flex justify-center' : 'px-3 pb-3'
            }
          >
            <Link
              to="/capture"
              title={collapsed ? 'Capture' : undefined}
              aria-label="Capture"
              className={`flex items-center justify-center gap-1 bg-ink text-white text-sm font-medium rounded-chip border border-ink hover:bg-ink-900 transition-colors ${collapsed ? 'w-10 h-10' : 'w-full px-3 py-2.5'}`}
            >
              {collapsed ? <Plus size={18} /> : '+ Capture'}
            </Link>
          </div>

          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                (location.pathname.startsWith(item.path) &&
                  item.path !== '/') ||
                location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={`relative flex items-center text-sm transition-colors ${collapsed ? 'justify-center mx-2 h-10 rounded-chip' : 'justify-between px-4 py-2 mx-2 rounded-chip'} ${isActive ? 'bg-ink text-white' : 'text-ink-700 hover:bg-canvas'}`}
                >
                  {collapsed ? (
                    <>
                      <Icon size={18} />
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-ruby-500 text-white text-[10px] leading-4 text-center rounded-full border border-panel">
                          {item.badge}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2 font-medium">
                        <Icon
                          size={16}
                          className={isActive ? 'text-white' : 'text-ink-500'}
                        />
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          size="small"
                          variant={item.badgeVariant || 'neutral'}
                          style={isActive ? 'soft' : 'filled'}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="border-t border-line p-2">
          {!collapsed && (
            <div className="px-2 pb-2 mb-2 border-b border-line">
              <Link
                to="/pair"
                className="flex items-center gap-2 text-xs text-ink-600 hover:text-ink p-2 rounded-chip hover:bg-canvas transition-colors"
              >
                <Smartphone size={14} />
                <span>Pair Device</span>
              </Link>
              <div className="flex items-center gap-2 text-xs text-ink-500 p-2">
                <Shield size={14} />
                <span>Privacy controls coming soon</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand nav' : 'Collapse nav'}
            aria-label={collapsed ? 'Expand nav' : 'Collapse nav'}
            className={`flex items-center gap-2 text-xs text-ink-500 hover:text-ink hover:bg-canvas rounded-chip transition-colors ${collapsed ? 'justify-center w-full h-10' : 'w-full px-3 py-2'}`}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <>
                <PanelLeftClose size={16} />
                <span className="font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden flex flex-col relative z-0">
        {children}
      </main>
    </div>
  )
}
