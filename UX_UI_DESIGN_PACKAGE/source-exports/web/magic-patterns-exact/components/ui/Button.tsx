import React from 'react'
import { Loader2 } from 'lucide-react'
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'violet'
type ButtonSize = 'small' | 'medium' | 'large'
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: React.ReactNode
  iconOnly?: React.ReactNode
  loading?: boolean
}
export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  leftIcon,
  iconOnly,
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const isIconOnly = Boolean(iconOnly) && !children
  const base =
    'inline-flex items-center justify-center gap-2 rounded-chip border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-azure-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-ink text-white border-ink hover:bg-ink-900',
    secondary: 'bg-panel text-ink border-line-strong hover:bg-canvas',
    tertiary: 'bg-transparent text-ink-700 border-transparent hover:bg-canvas',
    ghost: 'bg-transparent text-ink-700 border-transparent hover:bg-canvas',
    danger: 'bg-panel text-ruby-700 border-line-strong hover:bg-ruby-50',
    violet: 'bg-violet-500 text-white border-violet-500 hover:bg-violet-600',
  }
  const sizeClasses: Record<ButtonSize, string> = {
    small: 'text-xs px-3 py-1.5',
    medium: 'text-sm px-4 py-2',
    large: 'text-base px-5 py-2.5',
  }
  const iconSizeClasses: Record<ButtonSize, string> = {
    small: 'w-8 h-8 p-0',
    medium: 'w-10 h-10 p-0',
    large: 'w-11 h-11 p-0',
  }
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variantClasses[variant]} ${isIconOnly ? iconSizeClasses[size] : sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : iconOnly}
      {!isIconOnly && leftIcon}
      {!isIconOnly && children}
    </button>
  )
}
