/**
 * Access control: who can use the app.
 * No Google Admin required if you use allow-list or domain.
 *
 * Priority:
 * 1. ALLOWED_EMAILS (comma-separated) – only these emails (e.g. tim.green@preply.com,other@preply.com)
 * 2. ALLOWED_DOMAIN (e.g. preply.com) – any user with email ending in @preply.com
 * 3. Admin API group (all-preply-design@preply.com) – only if GOOGLE_SERVICE_ACCOUNT_KEY + GOOGLE_ADMIN_EMAIL are set
 */
// Dynamic import to avoid loading googleapis at module init time
// (googleapis is ~80MB and causes cold-start timeouts on Vercel)
let _isMemberOfGroup: ((email: string) => Promise<boolean>) | null = null
async function isMemberOfGroupLazy(email: string): Promise<boolean> {
  if (!_isMemberOfGroup) {
    const mod = await import('./group')
    _isMemberOfGroup = mod.isMemberOfGroup
  }
  return _isMemberOfGroup(email)
}

const ALLOWED_EMAILS_RAW = process.env.ALLOWED_EMAILS || ''
const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || '').toLowerCase().replace(/^@/, '')

function getAllowedEmailsSet(): Set<string> | null {
  if (!ALLOWED_EMAILS_RAW.trim()) return null
  const emails = ALLOWED_EMAILS_RAW.split(/[\s,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return emails.length ? new Set(emails) : null
}

const allowedEmailsCache = getAllowedEmailsSet()

export async function isAllowed(email: string): Promise<boolean> {
  if (!email) return false
  const normalized = email.toLowerCase().trim()

  if (allowedEmailsCache && allowedEmailsCache.size > 0) {
    return allowedEmailsCache.has(normalized)
  }

  if (ALLOWED_DOMAIN) {
    return normalized.endsWith('@' + ALLOWED_DOMAIN)
  }

  return isMemberOfGroupLazy(email)
}
