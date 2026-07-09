import React from 'react'

type CardVariant = 'default' | 'outlined' | 'elevated'
type CardPadding = 'none' | 'small' | 'medium' | 'large'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  isClickable?: boolean
}

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'medium',
  isClickable = false,
  onClick,
  onKeyDown,
  ...props
}: CardProps) {
  const variantClass: Record<CardVariant, string> = {
    default: 'bg-white border border-gray-200',
    outlined: 'bg-white border border-gray-300',
    elevated: 'bg-white border border-gray-200 shadow-sm',
  }
  const paddingClass: Record<CardPadding, string> = {
    none: '',
    small: 'p-3',
    medium: 'p-4',
    large: 'p-5',
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (!isClickable || !onClick || event.defaultPrevented) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>)
    }
  }

  return (
    <div
      className={`rounded ${variantClass[variant]} ${paddingClass[padding]} ${
        isClickable ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
      } ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardContent({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-sm font-bold text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  )
}
