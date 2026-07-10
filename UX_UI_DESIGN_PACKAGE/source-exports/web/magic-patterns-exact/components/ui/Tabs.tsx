import React, { useState, createContext, useContext } from 'react'
interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
}
const TabsContext = createContext<TabsContextValue | null>(null)
function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used inside <Tabs>.')
  }
  return context
}
export interface TabsProps {
  defaultTab: string
  children: React.ReactNode
  className?: string
}
export function Tabs({ defaultTab, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  return (
    <TabsContext.Provider
      value={{
        activeTab,
        setActiveTab,
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}
export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean
}
export function TabList({
  children,
  className = '',
  scrollable = false,
  ...props
}: TabListProps) {
  return (
    <div
      role="tablist"
      className={`${scrollable ? 'overflow-x-auto' : ''} ${className}`}
      {...props}
    >
      <div
        className={`flex border-b border-line ${scrollable ? 'min-w-max' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
export interface TabProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  id: string
}
export function Tab({ id, children, className = '', ...props }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext()
  const isActive = activeTab === id
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${isActive ? 'border-ink text-ink' : 'border-transparent text-ink-500 hover:text-ink hover:border-line-strong'} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
}
export function TabPanel({
  id,
  children,
  className = '',
  ...props
}: TabPanelProps) {
  const { activeTab } = useTabsContext()
  if (activeTab !== id) return null
  return (
    <div role="tabpanel" className={className} {...props}>
      {children}
    </div>
  )
}
