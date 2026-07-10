import React from 'react'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 ${className}`}
      {...props}
    />
  )
}
