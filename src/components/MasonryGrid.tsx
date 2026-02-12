import { useEffect } from 'react'
import Masonry from 'react-masonry-css'
import { useAuth } from '../contexts/AuthContext'
import { useImages } from '../hooks/useImages'
import ImageCard from './ImageCard'
import styles from './MasonryGrid.module.css'

const PLACEHOLDER_COUNT = 12
const PLACEHOLDER_STYLES = [
  { height: '180px' },
  { height: '240px' },
  { height: '160px' },
  { height: '220px' },
  { height: '200px' },
  { height: '260px' },
  { height: '190px' },
  { height: '170px' },
  { height: '230px' },
  { height: '210px' },
  { height: '250px' },
  { height: '195px' },
]

function Placeholders() {
  return (
    <>
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
        <div
          key={`ph-${i}`}
          className={styles.placeholder}
          style={PLACEHOLDER_STYLES[i % PLACEHOLDER_STYLES.length]}
        />
      ))}
    </>
  )
}

export default function MasonryGrid() {
  const { idToken } = useAuth()
  const { images, loading, prependImage } = useImages()

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ file: File }>
      const file = ev.detail?.file
      if (!file || !file.type.startsWith('image/') || !idToken) return
      const form = new FormData()
      form.append('file', file)
      fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: form,
      })
          .then((res) => {
            if (!res.ok) throw new Error('Upload failed')
            return res.json()
          })
          .then((data) => {
            if (data.image) prependImage(data.image)
          })
          .catch(() => {})
    }
    window.addEventListener('saveimageas-upload', handler)
    return () => window.removeEventListener('saveimageas-upload', handler)
  }, [idToken, prependImage])

  const showPlaceholders = loading || images.length === 0

  return (
    <Masonry
      breakpointCols={{ default: 3, 1200: 3, 900: 2, 600: 1 }}
      className={styles.masonry}
      columnClassName={styles.column}
    >
      {showPlaceholders ? (
        <Placeholders />
      ) : (
        images.map((img) => <ImageCard key={img.id} image={img} />)
      )}
    </Masonry>
  )
}
