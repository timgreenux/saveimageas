import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyIdToken, getBearerToken } from '../lib/auth'
import { isAllowed } from '../lib/access'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const idToken = getBearerToken(req) || (req.body && (req.body as any).idToken)
  if (!idToken) {
    return res.status(401).json({ error: 'Missing token', allowed: false })
  }
  const payload = await verifyIdToken(idToken)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid token', allowed: false })
  }
  const allowed = await isAllowed(payload.email)
  return res.status(200).json({ allowed })
}
