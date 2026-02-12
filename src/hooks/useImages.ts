import { useState, useEffect, useCallback } from 'react'
import { fetchImagesFromGitHub, isGitHubConfigured } from '../lib/github-images'
import type { ImageItem } from '../types/api'

export function useImages() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isGitHubConfigured()) {
        const list = await fetchImagesFromGitHub()
        if (list.length > 0) {
          setImages(list)
          return
        }
      }
      const fallback = await fetch('/images/manifest.json')
      if (fallback.ok) {
        const data = await fallback.json()
        const list = Array.isArray(data.images) ? data.images : []
        list.sort((a: ImageItem, b: ImageItem) => (b.uploadedAt || b.name).localeCompare(a.uploadedAt || a.name))
        setImages(list)
      } else {
        setImages([])
      }
    } catch (e) {
      try {
        const fallback = await fetch('/images/manifest.json')
        if (fallback.ok) {
          const data = await fallback.json()
          const list = Array.isArray(data.images) ? data.images : []
          list.sort((a: ImageItem, b: ImageItem) => (b.uploadedAt || b.name).localeCompare(a.uploadedAt || a.name))
          setImages(list)
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
  }, [])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const prependImage = useCallback((image: ImageItem) => {
    setImages((prev) => [image, ...prev])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  return { images, loading, error, refetch: fetchImages, prependImage, removeImage }
}
