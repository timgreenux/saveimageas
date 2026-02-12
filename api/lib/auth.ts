/**
 * Lightweight Google ID token verification.
 * Uses Google's tokeninfo endpoint instead of the heavy google-auth-library
 * package which crashes Vercel serverless functions.
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''

export type TokenPayload = {
  sub: string
  email: string
  name?: string
  picture?: string
}

export async function verifyIdToken(idToken: string): Promise<TokenPayload | null> {
  if (!GOOGLE_CLIENT_ID) return null
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )
    if (!res.ok) return null
    const data = await res.json()

    // Verify audience matches our client ID
    if (data.aud !== GOOGLE_CLIENT_ID) return null

    // Check token is not expired
    const exp = parseInt(data.exp, 10)
    if (exp && exp < Math.floor(Date.now() / 1000)) return null

    if (!data.email) return null

    return {
      sub: data.sub,
      email: data.email,
      name: data.name || undefined,
      picture: data.picture || undefined,
    }
  } catch {
    return null
  }
}

export function getBearerToken(req: { headers?: { authorization?: string } }): string | null {
  const auth = req.headers?.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}
