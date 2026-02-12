import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken } from '../lib/auth'
import { verifyIdToken } from '../lib/auth'
import { isAllowed } from '../lib/access'
import { getHearts, toggleHeart } from '../lib/hearts'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const imageId = req.query.imageId as string
  if (!imageId) {
    return res.status(400).json({ error: 'Missing imageId' })
  }
  const idToken = getBearerToken(req)
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const payload = await verifyIdToken(idToken)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' })
  }
  const allowed = await isAllowed(payload.email)
  if (!allowed) {
    return res.status(403).json({ error: 'Access denied' })
  }
  const userId = payload.sub

  if (req.method === 'GET') {
    const state = getHearts(imageId, userId)
    return res.status(200).json(state)
  }
  if (req.method === 'POST') {
    const state = toggleHeart(imageId, userId)
    return res.status(200).json(state)
  }
  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
