import { Readable } from 'stream'
import { google } from 'googleapis'

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '10-niaHwCBaj-LN2wbXc_GN8Sp__q1zAe'
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''
// User to impersonate for Drive (must have the folder shared with them). Same as admin is fine.
const DRIVE_IMPERSONATE_EMAIL = process.env.DRIVE_IMPERSONATE_EMAIL || process.env.GOOGLE_ADMIN_EMAIL || ''

export type DriveImage = {
  id: string
  name: string
  url: string
  thumbnail?: string
  mimeType?: string
  createdTime?: string
}

async function getDriveClient(): Promise<ReturnType<typeof google.drive> | null> {
  if (!SERVICE_ACCOUNT_KEY) return null
  try {
    const key = JSON.parse(Buffer.from(SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'))
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'],
    })
    const authClient = (await auth.getClient()) as any
    if (DRIVE_IMPERSONATE_EMAIL) authClient.subject = DRIVE_IMPERSONATE_EMAIL
    return google.drive({ version: 'v3', auth: authClient })
  } catch {
    return null
  }
}

const IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml', 'image/x-icon',
])

export async function listImages(): Promise<DriveImage[]> {
  const drive = await getDriveClient()
  if (!drive) return []
  try {
    const res = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false`,
      orderBy: 'createdTime desc',
      fields: 'files(id, name, mimeType, webContentLink, thumbnailLink, createdTime)',
      pageSize: 200,
    })
    const files = (res.data.files || []).filter(
      (f) => f.id && f.name && (IMAGE_MIMES.has((f.mimeType || '')) || /\.(gif|jpe?g|png|webp|bmp|svg|ico)$/i.test(f.name))
    )
    return files.map((f) => ({
      id: f.id!,
      name: f.name!,
      url: f.webContentLink || `https://drive.google.com/uc?export=view&id=${f.id}`,
      thumbnail: f.thumbnailLink ? f.thumbnailLink.replace(/=s\d+/, '=s400') : undefined,
      mimeType: f.mimeType || undefined,
      createdTime: f.createdTime || undefined,
    }))
  } catch (err) {
    console.error('Drive list error:', err)
    return []
  }
}

export async function uploadImage(buffer: Buffer, mimeType: string, name: string): Promise<DriveImage | null> {
  const drive = await getDriveClient()
  if (!drive) return null
  try {
    const res = await drive.files.create({
      requestBody: {
        name,
        parents: [DRIVE_FOLDER_ID],
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: Readable.from(buffer),
      },
      fields: 'id, name, mimeType, webContentLink, thumbnailLink, createdTime',
    })
    const f = res.data
    if (!f.id || !f.name) return null
    return {
      id: f.id,
      name: f.name,
      url: (f as any).webContentLink || `https://drive.google.com/uc?export=view&id=${f.id}`,
      thumbnail: (f as any).thumbnailLink ? (f as any).thumbnailLink.replace(/=s\d+/, '=s400') : undefined,
      mimeType: f.mimeType || undefined,
      createdTime: (f as any).createdTime || undefined,
    }
  } catch (err) {
    console.error('Drive upload error:', err)
    return null
  }
}
