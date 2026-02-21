import styles from '@/components/ui/PageTransition/PageTransition.module.css'

export default function Loading() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <img className={styles.logo} src="/knighty-logo.png" alt="" />
    </div>
  )
}
