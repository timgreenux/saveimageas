import { google } from 'googleapis'

const ALLOWED_GROUP = process.env.ALLOWED_GOOGLE_GROUP || 'all-preply-design@preply.com'
const ADMIN_EMAIL = process.env.GOOGLE_ADMIN_EMAIL || ''
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ''

let cachedMembers: Set<string> | null = null
let cacheTime = 0
const CACHE_MS = 5 * 60 * 1000 // 5 minutes

export async function isMemberOfGroup(email: string): Promise<boolean> {
  if (!email) return false
  const members = await getGroupMembers()
  return members.has(email.toLowerCase())
}

async function getGroupMembers(): Promise<Set<string>> {
  if (cachedMembers && Date.now() - cacheTime < CACHE_MS) {
    return cachedMembers
  }
  if (!ADMIN_EMAIL || !SERVICE_ACCOUNT_KEY) {
    console.warn('Group check disabled: GOOGLE_ADMIN_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY not set')
    return new Set()
  }
  try {
    const key = JSON.parse(Buffer.from(SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'))
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/admin.directory.group.readonly'],
    })
    const authClient = await auth.getClient() as any
    authClient.subject = ADMIN_EMAIL
    const admin = google.admin({ version: 'directory_v1', auth: authClient })
    const res = await admin.members.list({
      groupKey: ALLOWED_GROUP,
    })
    const members = new Set<string>()
    for (const m of res.data.members || []) {
      if (m.email) members.add(m.email.toLowerCase())
    }
    cachedMembers = members
    cacheTime = Date.now()
    return members
  } catch (err) {
    console.error('Failed to fetch group members:', err)
    return cachedMembers || new Set()
  }
}
