import React from 'react'
type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'neutral'
  | 'teal'
  | 'cyan'
  | 'azure'
  | 'violet'
  | 'magenta'
  | 'amber'
  | 'coral'
  | 'ruby'
  | 'lime'
type BadgeSize = 'small' | 'medium'
type BadgeStyle = 'filled' | 'bordered' | 'soft'
export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'> {
  variant?: BadgeVariant
  size?: BadgeSize
  style?: BadgeStyle
}
export function Badge({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  style = 'filled',
  ...props
}: BadgeProps) {
  const sizeClass =
    size === 'small'
      ? 'text-[11px] px-2 py-0.5 rounded-chip'
      : 'text-xs px-2.5 py-1 rounded-chip'
  const toneClasses: Record<BadgeVariant, Record<BadgeStyle, string>> = {
    primary: {
      filled: 'bg-ink text-white border-ink',
      bordered: 'bg-panel text-ink border-ink',
      soft: 'bg-canvas text-ink border-line',
    },
    secondary: {
      filled: 'bg-line-strong text-ink border-line-strong',
      bordered: 'bg-panel text-ink-600 border-line-strong',
      soft: 'bg-canvas text-ink-600 border-line',
    },
    neutral: {
      filled: 'bg-canvas text-ink-700 border-line',
      bordered: 'bg-panel text-ink-700 border-line',
      soft: 'bg-canvas text-ink-600 border-line',
    },
    teal: {
      filled: 'bg-teal-500 text-white border-teal-500',
      bordered: 'bg-panel text-teal-700 border-teal-500',
      soft: 'bg-teal-50 text-teal-700 border-teal-100',
    },
    cyan: {
      filled: 'bg-cyan-500 text-white border-cyan-500',
      bordered: 'bg-panel text-cyan-700 border-cyan-500',
      soft: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    },
    azure: {
      filled: 'bg-azure-500 text-white border-azure-500',
      bordered: 'bg-panel text-azure-700 border-azure-500',
      soft: 'bg-azure-50 text-azure-700 border-azure-100',
    },
    violet: {
      filled: 'bg-violet-500 text-white border-violet-500',
      bordered: 'bg-panel text-violet-700 border-violet-500',
      soft: 'bg-violet-50 text-violet-700 border-violet-100',
    },
    magenta: {
      filled: 'bg-magenta-500 text-white border-magenta-500',
      bordered: 'bg-panel text-magenta-700 border-magenta-500',
      soft: 'bg-magenta-50 text-magenta-700 border-magenta-100',
    },
    amber: {
      filled: 'bg-amber-500 text-white border-amber-500',
      bordered: 'bg-panel text-amber-700 border-amber-500',
      soft: 'bg-amber-50 text-amber-700 border-amber-100',
    },
    coral: {
      filled: 'bg-coral-500 text-white border-coral-500',
      bordered: 'bg-panel text-coral-700 border-coral-500',
      soft: 'bg-coral-50 text-coral-700 border-coral-100',
    },
    ruby: {
      filled: 'bg-ruby-500 text-white border-ruby-500',
      bordered: 'bg-panel text-ruby-700 border-ruby-500',
      soft: 'bg-ruby-50 text-ruby-700 border-ruby-100',
    },
    lime: {
      filled: 'bg-lime-500 text-white border-lime-500',
      bordered: 'bg-panel text-lime-700 border-lime-500',
      soft: 'bg-lime-50 text-lime-700 border-lime-100',
    },
  }
  return (
    <span
      className={`inline-flex items-center border font-medium whitespace-nowrap ${sizeClass} ${toneClasses[variant][style]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
