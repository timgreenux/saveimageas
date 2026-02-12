import { useState, useEffect, useCallback } from 'react'
import { useHearts } from '../hooks/useHearts'
import type { ImageItem } from '../types/api'
import styles from './ImageCard.module.css'

type Props = {
  image: ImageItem
}

export default function ImageCard({ image }: Props) {
  const [hover, setHover] = useState(false)
  const [heartState, setHeartState] = useState<{ count: number; hasHearted: boolean }>({
    count: 0,
    hasHearted: false,
  })
  const [animating, setAnimating] = useState(false)
  const { getHearts, toggleHeart } = useHearts()

  useEffect(() => {
    let cancelled = false
    getHearts(image.id).then((s) => {
      if (!cancelled) setHeartState(s)
    })
    return () => { cancelled = true }
  }, [image.id, getHearts])

  const handleHeartClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (animating) return
      setAnimating(true)
      const next = await toggleHeart(image.id)
      if (next) setHeartState(next)
      setTimeout(() => setAnimating(false), 600)
    },
    [image.id, toggleHeart, animating]
  )

  const showOverlay = hover

  return (
    <div
      className={styles.card}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className={styles.imageWrap}>
        <img
          src={image.thumbnail || image.url}
          alt={image.name}
          className={`${styles.img} ${showOverlay ? styles.imgBlur : ''}`}
          loading="lazy"
          decoding="async"
        />
        <div className={`${styles.overlay} ${showOverlay ? styles.overlayVisible : ''}`} />
        <div className={`${styles.heartWrap} ${showOverlay ? styles.heartWrapVisible : ''}`}>
          <button
            type="button"
            className={styles.heartBtn}
            onClick={handleHeartClick}
            aria-label={heartState.hasHearted ? 'Unheart' : 'Heart this image'}
          >
            <img
              src={heartState.hasHearted ? '/Assets/FavFilled.svg' : '/Assets/Fav.svg'}
              alt=""
              className={`${styles.heartIcon} ${animating ? styles.heartAnimating : ''} ${heartState.hasHearted ? styles.heartFilled : ''}`}
              width={48}
              height={48}
            />
            {heartState.count > 0 && (
              <span className={styles.heartCount} aria-hidden>
                {heartState.count}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
