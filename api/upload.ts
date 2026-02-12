import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getBearerToken, verifyIdToken } from './lib/auth'
import { isAllowed } from './lib/access'
import { uploadImageToGitHub } from './lib/github-images'

const USE_GITHUB = !!process.env.GITHUB_REPO

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Step 1: Auth
  const idToken = getBearerToken(req)
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: no Bearer token' })
  }

  let payload
  try {
    payload = await verifyIdToken(idToken)
  } catch (e) {
    return res.status(401).json({ error: 'Token verification threw: ' + (e instanceof Error ? e.message : String(e)) })
  }
  if (!payload) {
    return res.status(401).json({
      error: 'Invalid token. GOOGLE_CLIENT_ID set: ' + (!!process.env.GOOGLE_CLIENT_ID),
    })
  }

  let allowed
  try {
    allowed = await isAllowed(payload.email)
  } catch (e) {
    return res.status(500).json({ error: 'Access check failed: ' + (e instanceof Error ? e.message : String(e)) })
  }
  if (!allowed) {
    return res.status(403).json({ error: 'Access denied for ' + payload.email })
  }

  // Step 2: Parse body
  try {
    let body = req.body

    // Vercel should auto-parse JSON, but just in case:
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { /* leave as-is */ }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        error: 'Could not parse request body. Content-Type: ' + (req.headers['content-type'] || 'not set'),
        bodyType: typeof req.body,
      })
    }

    if (!body.data) {
      return res.status(400).json({ error: 'Missing "data" in body', keys: Object.keys(body) })
    }
    if (!body.filename) {
      return res.status(400).json({ error: 'Missing "filename" in body' })
    }

    const base64Data = (body.data as string).replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const filename = body.filename || `upload-${Date.now()}`
    const mimeType = body.mimeType || 'application/octet-stream'

    // Step 3: Upload
    if (!USE_GITHUB) {
      return res.status(500).json({
        error: 'No upload target. GITHUB_REPO: ' + (process.env.GITHUB_REPO || '(not set)'),
      })
    }

    const image = await uploadImageToGitHub(buffer, filename, mimeType)
    if (!image) {
      return res.status(500).json({ error: 'uploadImageToGitHub returned null. Check Vercel function logs.' })
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
      error: 'Upload exception: ' + (err instanceof Error ? err.message : String(err)),
    })
  }
}
