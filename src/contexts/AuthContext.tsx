import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type User = {
  id: string
  email: string
  name: string
  picture?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  isAllowed: boolean
  idToken: string | null
  signIn: () => Promise<void>
  signOut: () => void
  checkAllowed: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (res: { credential: string }) => void
            auto_select?: boolean
          }) => void
          prompt: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)
  const [idToken, setIdToken] = useState<string | null>(null)

  const checkAllowed = useCallback(async (): Promise<boolean> => {
    if (!idToken) return false
    const emailFromToken = (() => {
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]))
        return payload.email || ''
      } catch {
        return ''
      }
    })()
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (emailFromToken.toLowerCase().endsWith('@preply.com')) setIsAllowed(true)
        else setIsAllowed(false)
        return false
      }
      setIsAllowed(data.allowed === true)
      return data.allowed === true
    } catch {
      if (emailFromToken.toLowerCase().endsWith('@preply.com')) setIsAllowed(true)
      else setIsAllowed(false)
      return false
    }
  }, [idToken])

  useEffect(() => {
    const stored = sessionStorage.getItem('saveimageas_user')
    const token = sessionStorage.getItem('saveimageas_id_token')
    if (stored && token) {
      try {
        setUser(JSON.parse(stored))
        setIdToken(token)
      } catch {
        sessionStorage.removeItem('saveimageas_user')
        sessionStorage.removeItem('saveimageas_id_token')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user || !idToken) return
    checkAllowed()
  }, [user, idToken, checkAllowed])

  const signIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set')
      return
    }
    if (!window.google?.accounts?.id?.initialize) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      document.head.appendChild(script)
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Google script failed'))
      })
    }

    await new Promise<void>((resolve, reject) => {
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (res) => {
          try {
            const payload = JSON.parse(atob(res.credential.split('.')[1]))
            const u: User = {
              id: payload.sub,
              email: payload.email,
              name: payload.name || payload.email,
              picture: payload.picture,
            }
            setUser(u)
            setIdToken(res.credential)
            sessionStorage.setItem('saveimageas_user', JSON.stringify(u))
            sessionStorage.setItem('saveimageas_id_token', res.credential)
            resolve()
          } catch (e) {
            reject(e)
          }
        },
      })
      window.google!.accounts.id.prompt()
    })
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setIdToken(null)
    setIsAllowed(false)
    sessionStorage.removeItem('saveimageas_user')
    sessionStorage.removeItem('saveimageas_id_token')
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    isAllowed,
    idToken,
    signIn,
    signOut,
    checkAllowed,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
