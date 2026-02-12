import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { ImageItem } from '../types/api'

export function useImages() {
  const { idToken } = useAuth()
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (idToken) {
        const res = await fetch('/api/images', {
          headers: { Authorization: `Bearer ${idToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.images) && data.images.length > 0) {
            setImages(data.images)
            return
          }
        }
      }
      const fallback = await fetch('/images/manifest.json')
      if (fallback.ok) {
        const data = await fallback.json()
        setImages(Array.isArray(data.images) ? data.images : [])
      } else {
        setImages([])
      }
    } catch (e) {
      try {
        const fallback = await fetch('/images/manifest.json')
        if (fallback.ok) {
          const data = await fallback.json()
          setImages(Array.isArray(data.images) ? data.images : [])
          return
        }
      } catch {
        // ignore
      }
      setError(e instanceof Error ? e.message : 'Failed to load images')
      setImages([])
    } finally {
      setLoading(false)
    }
  }, [idToken])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const prependImage = useCallback((image: ImageItem) => {
    setImages((prev) => [image, ...prev])
  }, [])

  return { images, loading, error, refetch: fetchImages, prependImage }
}
