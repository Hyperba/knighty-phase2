import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './page.module.css'
import { projects } from '@/lib/projects'
import Comparison from '@/components/ui/Comparison/Comparison'
import { ArrowLeft } from 'lucide-react'
import CTASection from '@/components/sections/CTASection/CTASection'

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params
    const project = projects.find(p => p.slug === resolvedParams.slug)
    
    if (!project) {
        notFound()
    }

    const currentIndex = projects.findIndex(p => p.slug === resolvedParams.slug)
    const nextProjects = projects
        .slice(currentIndex + 1)
        .concat(projects.slice(0, currentIndex))
        .slice(0, 2)

    return (
        <main className={styles.projectDetail}>
            <div className={styles.mainContainer}>
  <div className={styles.backButton}>
                <Link href="/portfolio" className={styles.backLink}>
                    <ArrowLeft size={18} />
                    <span>View all builds</span>
                </Link>
            </div>

            <div className={styles.heroSection}>
                <h1 className={styles.title}>{project.name.toUpperCase()}</h1>
                <p className={styles.description}>{project.description}</p>
            </div>

            <div className={styles.mediaSection}>
                {project.comparison && project.comparisonImg ? (
                    <div className={styles.imageWrapper}>
                        <Comparison 
                            beforeImage={project.imageSrc}
                            afterImage={project.comparisonImg}
                            altText={project.name}
                        />
                    </div>
                ) : (
                    <div className={styles.imageWrapper}>
                        <img 
                            src={project.imageSrc} 
                            alt={project.srcAlt}
                            className={styles.projectImage}
                        />
                    </div>
                )}
            </div>

            <div className={styles.statsSection}>
                <h2 className={styles.statsTitle}>More about this project</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <p className={styles.statLabel}>YEAR</p>
                        <p className={styles.statValue}>{project.year}</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statLabel}>SIZE</p>
                        <p className={styles.statValue}>{project.size}</p>
                    </div>
                    <div className={styles.statCard}>
                        <p className={styles.statLabel}>BUILD TIME</p>
                        <p className={styles.statValue}>{project.buildTime}</p>
                    </div>
                </div>
            </div>
            </div>
          

            {nextProjects.length > 0 && (
                <div className={styles.moreBuildsSection}>
                    <h2 className={styles.moreBuildsTitle}>MORE BUILDS</h2>
                    <div className={styles.moreBuildsGrid}>
                        {nextProjects.map((nextProject) => (
                            <Link 
                                key={nextProject.id}
                                href={`/portfolio/${nextProject.slug}`}
                                className={styles.buildCard}
                            >
                                <div 
                                    className={styles.buildCardImage}
                                    style={{ backgroundImage: `url(${nextProject.imageSrc})` }}
                                >
                                    <div className={styles.buildCardOverlay} />
                                    <div className={styles.buildCardContent}>
                                        <h3 className={styles.buildCardTitle}>{nextProject.name}</h3>
                                        <p className={styles.buildCardBrief}>{nextProject.brief}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <CTASection />
        </main>
    )
}
