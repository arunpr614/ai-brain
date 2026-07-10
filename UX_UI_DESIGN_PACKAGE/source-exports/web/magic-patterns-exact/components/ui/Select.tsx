import React from 'react'
export interface SelectOption {
  value: string
  label: string
}
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[]
  placeholder?: string
}
export function Select({
  options,
  placeholder,
  className = '',
  ...props
}: SelectProps) {
  return (
    <select
      className={`h-10 px-3 pr-8 border border-line-strong rounded-chip bg-panel text-sm text-ink focus:outline-none focus:ring-2 focus:ring-azure-500 ${className}`}
      {...props}
    >
      {placeholder && !props.value && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
