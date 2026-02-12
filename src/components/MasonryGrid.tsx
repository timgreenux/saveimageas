import { useEffect, useState } from 'react'
import Masonry from 'react-masonry-css'
import { useAuth } from '../contexts/AuthContext'
import { useImages } from '../hooks/useImages'
import { updateMetadataInGitHub, deleteImageFromGitHub } from '../lib/github-images'
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

function fileToBase64Raw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Strip the data:image/...;base64, prefix to get raw base64
      const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '')
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ''
const GH_REPO = import.meta.env.VITE_GITHUB_REPO || ''
const GH_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
const GH_PATH = import.meta.env.VITE_GITHUB_IMAGES_PATH || 'images'

async function uploadToGitHub(
  file: File,
  uploaderName: string
): Promise<{ id: string; name: string; url: string; uploadedBy: string; uploadedAt: string } | null> {
  if (!GH_TOKEN || !GH_REPO) {
    throw new Error('GitHub upload not configured. Set VITE_GITHUB_TOKEN and VITE_GITHUB_REPO in Vercel env vars.')
  }

  const base64Content = await fileToBase64Raw(file)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const base = safeName.replace(/\.[^.]+$/, '')
  const ext = (safeName.match(/\.[^.]+$/) || ['.bin'])[0]
  const uniqueName = `${base}-${Date.now()}${ext}`
  const filePath = `${GH_PATH}/${uniqueName}`

  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Add image: ${uniqueName}`,
      content: base64Content,
      branch: GH_BRANCH,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${errText}`)
  }

  const now = new Date().toISOString().split('T')[0]
  try {
    await updateMetadataInGitHub(uniqueName, uploaderName, now)
  } catch (e) {
    console.warn('Upload succeeded but metadata update failed:', e)
  }

  return {
    id: uniqueName,
    name: uniqueName,
    url: `https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${filePath}`,
    uploadedBy: uploaderName,
    uploadedAt: now,
  }
}

export default function MasonryGrid() {
  const { user } = useAuth()
  const { images, loading, prependImage, removeImage } = useImages()
  const [uploading, setUploading] = useState(false)

  const handleDelete = async (image: { id: string; name: string; sha?: string }): Promise<void> => {
    if (!image.sha) {
      alert('Cannot delete: missing file info. Refresh and try again.')
      return
    }
    const filePath = `${GH_PATH}/${image.name}`
    try {
      await deleteImageFromGitHub(filePath, image.sha)
      removeImage(image.id)
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  useEffect(() => {
    const handler = async (e: Event) => {
      const ev = e as CustomEvent<{ file: File }>
      const file = ev.detail?.file
      if (!file || !file.type.startsWith('image/')) return

      setUploading(true)
      try {
        const uploaderName = user?.name || user?.email || 'Anonymous'
        const image = await uploadToGitHub(file, uploaderName)
        if (image) prependImage(image)
      } catch (err) {
        console.error('Upload error:', err)
        alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setUploading(false)
      }
    }
    window.addEventListener('saveimageas-upload', handler)
    return () => window.removeEventListener('saveimageas-upload', handler)
  }, [user, prependImage])

  // Dispatch uploading state so the sidebar can show a spinner
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('saveimageas-uploading', { detail: { uploading } }))
  }, [uploading])

  const showPlaceholders = loading || images.length === 0

  return (
    <Masonry
      breakpointCols={{ default: 3, 1200: 3, 900: 2, 768: 1 }}
      className={styles.masonry}
      columnClassName={styles.column}
    >
      {showPlaceholders ? (
        <Placeholders />
      ) : (
        images.map((img) => (
          <ImageCard key={img.id} image={img} onDelete={handleDelete} />
        ))
      )}
    </Masonry>
  )
}
