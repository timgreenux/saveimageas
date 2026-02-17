import { useRef, useState } from 'react'
import styles from './UploadImageDialog.module.css'

const DESCRIPTION_MAX_LENGTH = 256

type Props = {
  onClose: () => void
  onSave: (file: File, description: string) => void
}

export default function UploadImageDialog({ onClose, onSave }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleBrowse = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    if (!chosen || !chosen.type.startsWith('image/')) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(chosen)
    setPreviewUrl(URL.createObjectURL(chosen))
    e.target.value = ''
  }

  const handleSave = () => {
    if (!file) return
    onSave(file, description.trim().slice(0, DESCRIPTION_MAX_LENGTH))
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onClose()
  }

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    onClose()
  }

  const canSave = !!file

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upload image</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <label className={styles.label}>Optional description</label>
        <textarea
          className={styles.textarea}
          placeholder="eg. Title, artist, designer, context etc"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
        />
        <div className={styles.charCount}>
          {description.length}/{DESCRIPTION_MAX_LENGTH}
        </div>
        <div className={styles.browseRow}>
          <div className={styles.browseIcon} aria-hidden>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <button type="button" className={styles.browseBtn} onClick={handleBrowse}>
            Browse images
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          aria-hidden
          className={styles.hiddenInput}
        />
        {previewUrl && (
          <div className={styles.previewWrap}>
            <img src={previewUrl} alt="Preview" className={styles.preview} />
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
