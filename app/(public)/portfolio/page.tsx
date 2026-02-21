import Link from 'next/link'
import styles from './page.module.css'
import { projects } from '@/lib/projects'
import MainButton from '@/components/ui/MainButton/MainButton'

export default function Portfolio() {
  return (
    <main className={styles.portfolio}>
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>BUILDS</p>
          <h1 className={styles.title}>EXPLORE OUR BEST BUILDS</h1>
        </div>
      </div>

      <div className={styles.gridContainer}>
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/portfolio/${project.slug}`}
            className={`${styles.cardLink} ${index === 0 ? styles.cardFeatured : ''}`}
          >
            <div
              className={styles.card}
              style={{ backgroundImage: `url(${project.imageSrc})` }}
            >
              <div className={styles.cardOverlay} />
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{project.name}</h2>
                <p className={styles.cardBrief}>{project.brief}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
