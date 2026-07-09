import React from 'react'
export type BadgeColor =
  | 'teal' // saved/full text
  | 'cyan' // transcript/reading/web capture
  | 'azure' // PDF/item detail/this-item scope
  | 'violet' // Ask/AI/selected items
  | 'magenta' // collections
  | 'amber' // preview-only
  | 'coral' // metadata-only/capture issues
  | 'ruby' // needs-upgrade/repair
  | 'lime' // updated
  | 'slate' // default/neutral
interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  variant?: 'filled' | 'outlined' | 'subtle'
  className?: string
}
export function Badge({
  children,
  color = 'slate',
  variant = 'subtle',
  className = '',
}: BadgeProps) {
  const colorStyles = {
    teal: {
      filled: 'bg-teal-600 text-white border-transparent',
      outlined: 'bg-transparent text-teal-700 border-teal-300',
      subtle: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    cyan: {
      filled: 'bg-cyan-600 text-white border-transparent',
      outlined: 'bg-transparent text-cyan-700 border-cyan-300',
      subtle: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    },
    azure: {
      filled: 'bg-blue-600 text-white border-transparent',
      outlined: 'bg-transparent text-blue-700 border-blue-300',
      subtle: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    violet: {
      filled: 'bg-violet-600 text-white border-transparent',
      outlined: 'bg-transparent text-violet-700 border-violet-300',
      subtle: 'bg-violet-50 text-violet-800 border-violet-200',
    },
    magenta: {
      filled: 'bg-fuchsia-600 text-white border-transparent',
      outlined: 'bg-transparent text-fuchsia-700 border-fuchsia-300',
      subtle: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
    },
    amber: {
      filled: 'bg-amber-600 text-white border-transparent',
      outlined: 'bg-transparent text-amber-700 border-amber-300',
      subtle: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    coral: {
      filled: 'bg-rose-500 text-white border-transparent',
      outlined: 'bg-transparent text-rose-700 border-rose-300',
      subtle: 'bg-rose-50 text-rose-800 border-rose-200',
    },
    ruby: {
      filled: 'bg-red-600 text-white border-transparent',
      outlined: 'bg-transparent text-red-700 border-red-300',
      subtle: 'bg-red-50 text-red-800 border-red-200',
    },
    lime: {
      filled: 'bg-lime-600 text-white border-transparent',
      outlined: 'bg-transparent text-lime-700 border-lime-300',
      subtle: 'bg-lime-50 text-lime-800 border-lime-200',
    },
    slate: {
      filled: 'bg-slate-700 text-white border-transparent',
      outlined: 'bg-transparent text-slate-700 border-slate-300',
      subtle: 'bg-slate-100 text-slate-800 border-slate-200',
    },
  }
  const baseStyle =
    'inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium border'
  const style = colorStyles[color][variant]
  return (
    <span className={`${baseStyle} ${style} ${className}`}>{children}</span>
  )
}
