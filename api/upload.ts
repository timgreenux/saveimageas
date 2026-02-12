import type { VercelRequest, VercelResponse } from '@vercel/node'
import { IncomingForm } from 'formidable'
import { readFileSync } from 'fs'
import { getBearerToken } from './lib/auth'
import { verifyIdToken } from './lib/auth'
import { isAllowed } from './lib/access'
import { uploadImageToGitHub } from './lib/github-images'
import { uploadImage as uploadImageToDrive } from './lib/drive'

export const config = {
  api: {
    bodyParser: false,
  },
}

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

  const form = new IncomingForm({ maxFileSize: 20 * 1024 * 1024 })
  const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) reject(err)
      else resolve([fields, files])
    })
  })
  const file = Array.isArray(files.file) ? files.file[0] : files.file
  if (!file?.filepath) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const buffer = readFileSync(file.filepath)
  const mimeType = file.mimetype || 'application/octet-stream'
  const name = file.originalFilename || `upload-${Date.now()}`
  const image = USE_GITHUB
    ? await uploadImageToGitHub(buffer, name, mimeType)
    : await uploadImageToDrive(buffer, mimeType, name)
  if (!image) {
    return res.status(500).json({ error: 'Upload failed' })
  }
  return res.status(200).json({ image })
}
