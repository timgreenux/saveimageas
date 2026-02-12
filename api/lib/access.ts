/**
 * Access control: who can use the app.
 *
 * Priority:
 * 1. ALLOWED_EMAILS (comma-separated) – only these emails
 * 2. ALLOWED_DOMAIN (e.g. preply.com) – any user with email ending in @preply.com
 * 3. Falls back to deny
 */

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

  // No access control configured — deny by default
  return false
}
