import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifyIdToken } from './lib/auth'
import { isAllowed } from './lib/access'
import { uploadImageToGitHub } from './lib/github-images'

const USE_GITHUB = !!process.env.GITHUB_REPO

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Auth
    const idToken = getBearerToken(req)
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized: no Bearer token' })
    }

    const payload = await verifyIdToken(idToken)
    if (!payload) {
      return res.status(401).json({
        error: 'Invalid token. GOOGLE_CLIENT_ID set: ' + (!!process.env.GOOGLE_CLIENT_ID),
      })
    }

    const allowed = await isAllowed(payload.email)
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied for ' + payload.email })
    }

    // Parse body
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { /* leave as-is */ }
    }

    if (!body || typeof body !== 'object' || !body.data || !body.filename) {
      return res.status(400).json({
        error: 'Bad request. Need {data, filename, mimeType}.',
        bodyType: typeof req.body,
        hasBody: !!req.body,
      })
    }

    const base64Data = (body.data as string).replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const filename = body.filename || `upload-${Date.now()}`
    const mimeType = body.mimeType || 'application/octet-stream'

    if (!USE_GITHUB) {
      return res.status(500).json({
        error: 'No upload target. Set GITHUB_REPO env var.',
      })
    }

    const image = await uploadImageToGitHub(buffer, filename, mimeType)
    if (!image) {
      return res.status(500).json({ error: 'GitHub upload returned null. Check function logs.' })
    }

    const uploaderName = payload.name || payload.email
    const now = new Date().toISOString().split('T')[0]

    return res.status(200).json({
      image: {
        ...image,
        uploadedBy: uploaderName,
        uploadedAt: now,
      },
    })
  } catch (err) {
    console.error('Upload error:', err)
    return res.status(500).json({
      error: 'Exception: ' + (err instanceof Error ? err.message : String(err)),
    })
  }
}
