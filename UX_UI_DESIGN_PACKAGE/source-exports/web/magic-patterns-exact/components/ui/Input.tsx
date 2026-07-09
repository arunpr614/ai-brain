import React from 'react'
type InputSize = 'small' | 'medium'
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  startAdornment?: React.ReactNode
  size?: InputSize
}
export function Input({
  label,
  error,
  startAdornment,
  size = 'medium',
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const heightClass = size === 'small' ? 'h-9 text-sm' : 'h-10 text-sm'
  const paddingLeft = startAdornment ? 'pl-9' : 'pl-3'
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-ink mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {startAdornment && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-ink-400 pointer-events-none">
            {startAdornment}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full ${heightClass} ${paddingLeft} pr-3 border rounded-chip bg-panel text-ink placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-azure-500 ${error ? 'border-ruby-500' : 'border-line-strong'}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-ruby-600">{error}</p>}
    </div>
  )
}
