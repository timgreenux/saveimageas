import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifyIdToken } from '../lib/auth'
import { isAllowed } from '../lib/access'
import { listImagesFromGitHub } from '../lib/github-images'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
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
    const images = await listImagesFromGitHub()
    return res.status(200).json({ images })
  } catch (err) {
    console.error('Images error:', err)
    return res.status(500).json({
      error: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    })
  }
}
