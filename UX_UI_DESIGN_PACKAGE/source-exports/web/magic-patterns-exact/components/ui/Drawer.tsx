import React from 'react'
export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  position?: 'right' | 'left' | 'bottom'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
}
export function Drawer({
  isOpen,
  onClose,
  position = 'right',
  size = 'md',
  children,
}: DrawerProps) {
  if (!isOpen) return null
  const horizontalSize: Record<NonNullable<DrawerProps['size']>, string> = {
    sm: 'w-80',
    md: 'w-[420px]',
    lg: 'w-[560px]',
    xl: 'w-[720px]',
    full: 'w-full',
  }
  const bottomSize: Record<NonNullable<DrawerProps['size']>, string> = {
    sm: 'h-64',
    md: 'h-[360px]',
    lg: 'h-[560px]',
    xl: 'h-[720px]',
    full: 'h-full',
  }
  const alignment =
    position === 'right'
      ? 'items-stretch justify-end'
      : position === 'left'
        ? 'items-stretch justify-start'
        : 'items-end justify-center'
  const panelClass =
    position === 'bottom'
      ? `${bottomSize[size]} w-full max-w-[520px] rounded-t-card border-t border-line`
      : `${horizontalSize[size]} h-full border-l border-line`
  return (
    <div className={`fixed inset-0 z-50 flex ${alignment}`}>
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-ink-900/20"
        onClick={onClose}
      />
      <div
        className={`relative bg-panel shadow-raised overflow-auto ${panelClass}`}
      >
        {children}
      </div>
    </div>
  )
}
