import { useEffect, useState, useRef } from 'react'
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

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1] ?? '')
  let n = bstr.length
  const u8 = new Uint8Array(n)
  while (n--) u8[n] = bstr.charCodeAt(n)
  return new File([u8], filename, { type: mime })
}

const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || ''
const GH_REPO = import.meta.env.VITE_GITHUB_REPO || ''
const GH_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main'
const GH_PATH = import.meta.env.VITE_GITHUB_IMAGES_PATH || 'images'

async function uploadToGitHub(
  file: File,
  uploaderName: string,
  description?: string
): Promise<{ id: string; name: string; url: string; uploadedBy: string; uploadedAt: string; description?: string; sha?: string } | null> {
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

  const resData = await res.json()
  const sha = resData.content?.sha ?? resData.sha ?? undefined

  const now = new Date().toISOString().split('T')[0]
  const desc = description?.trim().slice(0, 256) || undefined
  try {
    await updateMetadataInGitHub(uniqueName, uploaderName, now, desc)
  } catch (e) {
    console.warn('Upload succeeded but metadata update failed:', e)
    await new Promise((r) => setTimeout(r, 1500))
    try {
      await updateMetadataInGitHub(uniqueName, uploaderName, now, desc)
    } catch (e2) {
      console.warn('Metadata retry also failed:', e2)
    }
  }

  return {
    id: uniqueName,
    name: uniqueName,
    url: `https://raw.githubusercontent.com/${GH_REPO}/${GH_BRANCH}/${filePath}`,
    uploadedBy: uploaderName,
    uploadedAt: now,
    ...(desc ? { description: desc } : {}),
    sha,
  }
}

export default function MasonryGrid() {
  const { user } = useAuth()
  const { images, loading, prependImage, removeImage } = useImages()
  const [uploading, setUploading] = useState(false)
  type QueueItem = { file: File; description?: string }
  const queueRef = useRef<QueueItem[]>([])
  const processingRef = useRef(false)

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

  const processQueueRef = useRef<() => void>(() => {})

  useEffect(() => {
    processQueueRef.current = async () => {
      if (processingRef.current || queueRef.current.length === 0) return
      const item = queueRef.current.shift()
      if (!item) return
      processingRef.current = true
      setUploading(true)
      const uploaderName = user?.name ?? user?.email ?? 'Anonymous'
      try {
        const image = await uploadToGitHub(item.file, uploaderName, item.description)
        if (image) prependImage(image)
      } catch (err) {
        console.error('Upload error:', err)
        alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        processingRef.current = false
        setUploading(queueRef.current.length > 0)
        if (queueRef.current.length > 0) processQueueRef.current()
      }
    }
  }, [user, prependImage])

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ file: File; description?: string }>
      const file = ev.detail?.file
      if (!file || !file.type.startsWith('image/')) return
      queueRef.current.push({ file, description: ev.detail?.description })
      setUploading(true)
      processQueueRef.current()
    }
    window.addEventListener('saveimageas-upload', handler)
    return () => window.removeEventListener('saveimageas-upload', handler)
  }, [])

  // Chrome extension: "Post to saveimageas" – app requests pending upload when ready so we don't miss the message
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'SAVEIMAGEAS_EXTENSION_UPLOAD' || !e.data?.payload) return
      const { dataUrl, filename } = e.data.payload
      if (!dataUrl || typeof filename !== 'string') return
      try {
        const file = dataURLtoFile(dataUrl, filename)
        window.dispatchEvent(new CustomEvent('saveimageas-upload', { detail: { file } })) // no description from extension
      } catch (err) {
        console.error('Extension upload:', err)
      }
    }
    window.addEventListener('message', handler)
    const requestPending = () => window.postMessage({ type: 'SAVEIMAGEAS_GET_PENDING' }, '*')
    requestPending()
    const t1 = window.setTimeout(requestPending, 150)
    const t2 = window.setTimeout(requestPending, 400)
    const t3 = window.setTimeout(requestPending, 800)
    const t4 = window.setTimeout(requestPending, 1500)
    return () => {
      window.removeEventListener('message', handler)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

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
