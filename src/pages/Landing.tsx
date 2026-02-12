import { useEffect, useRef, useContext } from 'react'
import { useScroll, ScrollContainerContext } from '../contexts/ScrollContext'
import MasonryGrid from '../components/MasonryGrid'
import styles from './Landing.module.css'

const HERO_IN_VIEW_THRESHOLD = 120

export default function Landing() {
  const scroll = useScroll()
  const scrollContainer = useContext(ScrollContainerContext)
  const heroRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const containerRef = scrollContainer?.ref
    if (!containerRef || !scroll || !scrollContainer?.ready) return

    const updateHeroState = () => {
      const root = containerRef.current
      if (!root) return
      const outOfView = root.scrollTop > HERO_IN_VIEW_THRESHOLD
      scroll.setHeroOutOfView(outOfView)
    }

    const root = containerRef.current
    if (!root) return
    updateHeroState()
    root.addEventListener('scroll', updateHeroState, { passive: true })

    return () => root.removeEventListener('scroll', updateHeroState)
  }, [scroll, scrollContainer?.ref, scrollContainer?.ready])

  return (
    <div className={styles.wrapper}>
      <section
        ref={heroRef}
        className={styles.hero}
        aria-label="Welcome"
        data-scrolled={scroll?.heroOutOfView ? 'true' : undefined}
      >
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
        <img src="/Assets/logo.svg" alt="save image as" className={styles.heroLogo} />
      </section>
      <section className={styles.feedSection} aria-label="Image feed">
        <MasonryGrid />
      </section>
    </div>
  )
}
