import { createContext, useContext, useState, type ReactNode, type RefObject } from 'react'

type ScrollContextValue = {
  heroOutOfView: boolean
  setHeroOutOfView: (v: boolean) => void
}

const ScrollContext = createContext<ScrollContextValue | null>(null)

export type ScrollContainerContextValue = {
  ref: RefObject<HTMLDivElement | null>
  ready: boolean
}
export const ScrollContainerContext = createContext<ScrollContainerContextValue | null>(null)

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [heroOutOfView, setHeroOutOfView] = useState(false)
  return (
    <ScrollContext.Provider value={{ heroOutOfView, setHeroOutOfView }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScroll() {
  const ctx = useContext(ScrollContext)
  return ctx
}
