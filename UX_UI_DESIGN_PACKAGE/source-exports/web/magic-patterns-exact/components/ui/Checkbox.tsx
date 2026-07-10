import React from 'react'
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}
export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`w-4 h-4 rounded-chip border-line-strong text-azure-500 focus:ring-azure-500 ${className}`}
      {...props}
    />
  )
}
