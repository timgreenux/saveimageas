import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifyIdToken } from './lib/auth'
import { isAllowed } from './lib/access'
import { uploadImageToGitHub } from './lib/github-images'

const USE_GITHUB = !!process.env.GITHUB_REPO

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
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

  try {
    const body = req.body
    if (!body?.data || !body?.filename) {
      return res.status(400).json({ error: 'Missing data or filename in request body' })
    }

    const base64Data = (body.data as string).replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const mimeType = body.mimeType || 'application/octet-stream'
    const filename = body.filename || `upload-${Date.now()}`

    if (!USE_GITHUB) {
      return res.status(500).json({ error: 'No upload target configured. Set GITHUB_REPO.' })
    }

    const image = await uploadImageToGitHub(buffer, filename, mimeType)
    if (!image) {
      return res.status(500).json({ error: 'Upload to GitHub failed' })
    }

    // Include uploader info
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
    return res.status(500).json({ error: 'Upload failed: ' + (err instanceof Error ? err.message : 'unknown') })
  }
}
