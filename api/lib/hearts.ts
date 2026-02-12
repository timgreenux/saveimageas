// In-memory store; for production use Vercel KV or a database.
const store = new Map<string, { userIds: Set<string> }>()

function key(imageId: string) {
  return `hearts:${imageId}`
}

export function getHearts(imageId: string, userId: string): { count: number; hasHearted: boolean } {
  const data = store.get(key(imageId))
  if (!data) return { count: 0, hasHearted: false }
  return {
    count: data.userIds.size,
    hasHearted: data.userIds.has(userId),
  }
}

export function toggleHeart(imageId: string, userId: string): { count: number; hasHearted: boolean } {
  const k = key(imageId)
  let data = store.get(k)
  if (!data) {
    data = { userIds: new Set() }
    store.set(k, data)
  }
  if (data.userIds.has(userId)) {
    data.userIds.delete(userId)
  } else {
    data.userIds.add(userId)
  }
  return {
    count: data.userIds.size,
    hasHearted: data.userIds.has(userId),
  }
}
