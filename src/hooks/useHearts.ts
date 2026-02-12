import { useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { HeartState } from '../types/api'

const LOCAL_HEARTS_KEY = 'saveimageas_hearts'

function getLocalHeartedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_HEARTS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function setLocalHeartedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LOCAL_HEARTS_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

export function useHearts() {
  const { idToken, user } = useAuth()

  const getHearts = useCallback(
    async (imageId: string): Promise<HeartState> => {
      const fallback = (): HeartState => {
        const ids = getLocalHeartedIds()
        return { count: ids.has(imageId) ? 1 : 0, hasHearted: ids.has(imageId) }
      }
      if (!idToken && !user) return fallback()
      try {
        const res = await fetch(`/api/hearts/${imageId}`, {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        })
        if (!res.ok) return fallback()
        const data = await res.json()
        return {
          count: typeof data.count === 'number' ? data.count : 0,
          hasHearted: !!data.hasHearted,
        }
      } catch {
        return fallback()
      }
    },
    [idToken, user]
  )

  const toggleHeart = useCallback(
    async (imageId: string): Promise<HeartState | null> => {
      const useLocalOnly = (): HeartState => {
        const ids = getLocalHeartedIds()
        if (ids.has(imageId)) ids.delete(imageId)
        else ids.add(imageId)
        setLocalHeartedIds(ids)
        return { count: ids.has(imageId) ? 1 : 0, hasHearted: ids.has(imageId) }
      }
      if (!idToken && !user) return useLocalOnly()
      try {
        const res = await fetch(`/api/hearts/${imageId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        })
        if (!res.ok) return useLocalOnly()
        const data = await res.json()
        return {
          count: typeof data.count === 'number' ? data.count : 0,
          hasHearted: !!data.hasHearted,
        }
      } catch {
        return useLocalOnly()
      }
    },
    [idToken, user]
  )

  return { getHearts, toggleHeart }
}
