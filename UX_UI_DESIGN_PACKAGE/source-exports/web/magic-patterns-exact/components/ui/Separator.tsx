import React from 'react'
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  spacing?: number
}
export function Separator({
  orientation = 'horizontal',
  spacing,
  className = '',
  style,
  ...props
}: SeparatorProps) {
  const isVertical = orientation === 'vertical'
  const spacingStyle =
    spacing === undefined
      ? undefined
      : isVertical
        ? {
            marginLeft: spacing,
            marginRight: spacing,
          }
        : {
            marginTop: spacing,
            marginBottom: spacing,
          }
  return (
    <div
      className={`${isVertical ? 'w-px h-full' : 'h-px w-full'} bg-line ${className}`}
      style={{
        ...spacingStyle,
        ...style,
      }}
      {...props}
    />
  )
}
