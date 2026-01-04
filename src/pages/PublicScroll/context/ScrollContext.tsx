import { createContext, useContext } from 'react'

type ScrollContextType = {
  activeUsersCount: number
}

const ScrollContext = createContext<ScrollContextType | null>(null)

export function ScrollProvider({
  children,
  activeUsersCount,
}: {
  children: React.ReactNode
  activeUsersCount: number
}) {
  return (
    <ScrollContext.Provider value={{ activeUsersCount }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScrollContext() {
  const context = useContext(ScrollContext)
  if (!context) {
    throw new Error('useScrollContext must be used within a ScrollProvider')
  }
  return context
}
