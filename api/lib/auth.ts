import { OAuth2Client } from 'google-auth-library'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const client = new OAuth2Client(GOOGLE_CLIENT_ID)

export type TokenPayload = {
  sub: string
  email: string
  name?: string
  picture?: string
}

export async function verifyIdToken(idToken: string): Promise<TokenPayload | null> {
  if (!GOOGLE_CLIENT_ID) return null
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    if (!payload?.email) return null
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
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
