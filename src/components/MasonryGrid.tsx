import { useEffect, useState } from 'react'
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function MasonryGrid() {
  const { idToken } = useAuth()
  const { images, loading, prependImage } = useImages()
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const handler = async (e: Event) => {
      const ev = e as CustomEvent<{ file: File }>
      const file = ev.detail?.file
      if (!file || !file.type.startsWith('image/') || !idToken) return

      setUploading(true)
      try {
        const dataUrl = await fileToBase64(file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            data: dataUrl,
            filename: file.name,
            mimeType: file.type,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Upload failed:', err)
          alert(`Upload failed: ${err.error || res.statusText}`)
          return
        }

        const data = await res.json()
        if (data.image) prependImage(data.image)
      } catch (err) {
        console.error('Upload error:', err)
        alert('Upload failed. Check the console for details.')
      } finally {
        setUploading(false)
      }
    }
    window.addEventListener('saveimageas-upload', handler)
    return () => window.removeEventListener('saveimageas-upload', handler)
  }, [idToken, prependImage])

  // Dispatch uploading state so the sidebar can show a spinner
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('saveimageas-uploading', { detail: { uploading } }))
  }, [uploading])

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
