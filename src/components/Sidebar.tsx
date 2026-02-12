import { NavLink } from 'react-router-dom'
import { useRef } from 'react'
import styles from './Sidebar.module.css'

const iconPreply = '/Assets/PreplySymbol.svg'
const iconInfo = '/Assets/Info.svg'
const iconImageAdd = '/Assets/ImageAdd.svg'

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    </aside>
  )
}
