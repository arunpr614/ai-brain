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
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const heightClass = size === 'small' ? 'h-9 text-sm' : 'h-10 text-sm'
  const paddingLeft = startAdornment ? 'pl-9' : 'pl-3'

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-900 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {startAdornment && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 pointer-events-none">
            {startAdornment}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full ${heightClass} ${paddingLeft} pr-3 border rounded bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 ${
            error ? 'border-gray-900' : 'border-gray-300'
          }`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-gray-700">{error}</p>}
    </div>
  )
}
