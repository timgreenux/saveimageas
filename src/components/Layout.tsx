import { useRef, useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useScroll, ScrollContainerContext } from '../contexts/ScrollContext'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout() {
  const location = useLocation()
  const scroll = useScroll()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollContainerReady, setScrollContainerReady] = useState(false)
  const setRef = useCallback((el: HTMLDivElement | null) => {
    ;(scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (el) setScrollContainerReady(true)
  }, [])
  const isLanding = location.pathname === '/' || location.pathname === '/feed'
  const headerTitleVisible = !isLanding || (scroll?.heroOutOfView ?? false)

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={`${styles.title} ${headerTitleVisible ? styles.titleVisible : ''}`}>
            save image as
          </h1>
        </header>
        <div className={styles.contentWrap}>
          <div ref={setRef} className={styles.scrollContainer}>
            <ScrollContainerContext.Provider value={{ ref: scrollContainerRef, ready: scrollContainerReady }}>
              <Outlet />
            </ScrollContainerContext.Provider>
          </div>
        </div>
      </main>
    </div>
  )
}
