import { NavLink } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from './Sidebar.module.css'

const iconPreply = '/Assets/PreplySymbol.svg'
const iconInfo = '/Assets/Info.svg'
const iconImageAdd = '/Assets/ImageAdd.svg'

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, signOut } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [showSignOutToast, setShowSignOutToast] = useState(false)
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showSignOutToast) return
    const handleClickOutside = (e: MouseEvent) => {
      if (toastRef.current && !toastRef.current.contains(e.target as Node)) {
        setShowSignOutToast(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showSignOutToast])

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ uploading: boolean }>
      setUploading(ev.detail?.uploading ?? false)
    }
    window.addEventListener('saveimageas-uploading', handler)
    return () => window.removeEventListener('saveimageas-uploading', handler)
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const event = new CustomEvent('saveimageas-upload', { detail: { file } })
    window.dispatchEvent(event)
    e.target.value = ''
  }

  return (
    <aside className={styles.sidebar}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        aria-hidden
      />
      <div className={styles.sidebarHeader}>
        <NavLink to="/" className={styles.logoLink} aria-label="Home">
          <img src={iconPreply} alt="" className={styles.logo} width={64} height={64} />
        </NavLink>
      </div>
      <nav className={styles.nav} aria-label="Main">
        <NavLink
          to="/info"
          className={({ isActive }) => (isActive ? styles.navItemActive : styles.navItem)}
          aria-label="Info"
        >
          <img src={iconInfo} alt="" width={24} height={24} />
        </NavLink>
        <button
          type="button"
          className={styles.navItemUpload}
          onClick={handleUploadClick}
          aria-label="Upload image"
        >
          <img src={iconImageAdd} alt="" width={24} height={24} />
        </button>
      </nav>
      {user && (
        <div className={styles.userSection} ref={toastRef}>
          {uploading && (
            <div className={styles.spinner} aria-label="Uploading">
              <svg viewBox="0 0 36 36" className={styles.spinnerSvg}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(209,61,118,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#D13D76" strokeWidth="3" strokeDasharray="25 75" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <button
            type="button"
            className={styles.userAvatar}
            title={user.name}
            onClick={() => setShowSignOutToast((v) => !v)}
            aria-expanded={showSignOutToast}
            aria-haspopup="true"
          >
            {getInitials(user.name)}
          </button>
          {showSignOutToast && (
            <div className={styles.signOutToast}>
              <button type="button" className={styles.signOutBtn} onClick={() => { signOut(); setShowSignOutToast(false); }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
