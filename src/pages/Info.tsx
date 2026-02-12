import styles from './Info.module.css'

const CATEGORIES = [
  'branding',
  'typography',
  'packaging',
  'product',
  'graphic',
  'art',
  'anything*',
]

export default function Info() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <ul className={styles.categoryList}>
          {CATEGORIES.map((label) => (
            <li key={label} className={styles.categoryItem}>
              {label}
            </li>
          ))}
        </ul>
        <p className={styles.tagline}>
          <span className={styles.asterisk} aria-hidden>*</span> Keep it SFW.
        </p>
      </div>
    </div>
  )
}
