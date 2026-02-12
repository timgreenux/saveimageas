import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './SignIn.module.css'

export default function SignIn() {
  const navigate = useNavigate()
  const { user, isAllowed, renderGoogleButton, signOut, signInError, isGoogleConfigured } = useAuth()
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const denied = user && !isAllowed

  useEffect(() => {
    if (user && isAllowed) navigate('/', { replace: true })
  }, [user, isAllowed, navigate])

  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      ;(buttonContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      if (el && isGoogleConfigured && !denied) {
        renderGoogleButton(el)
      }
    },
    [isGoogleConfigured, denied, renderGoogleButton]
  )

  return (
    <div className={styles.page}>
      <a href="/" className={styles.logoLink} aria-label="Home">
        <img src="/Assets/PreplySymbol.svg" alt="" className={styles.logo} width={64} height={64} />
      </a>
      <div className={styles.content}>
        <img src="/Assets/logo.svg" alt="save image as" className={styles.mainLogo} />
        {denied ? (
          <div className={styles.denied}>
            <p className={styles.deniedText}>
              You don’t have access to this app. Access is restricted by allow-list or domain.
            </p>
            <button type="button" className={styles.signOutBtn} onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <>
            {signInError && (
              <p className={styles.signInError} role="alert">
                {signInError}
              </p>
            )}
            <p className={styles.signInHint}>Sign in with your Preply Google account</p>
            <div ref={setContainerRef} className={styles.googleButtonContainer} />
          </>
        )}
      </div>
    </div>
  )
}
