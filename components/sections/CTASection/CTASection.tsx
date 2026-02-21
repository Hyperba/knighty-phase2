'use client'

import styles from './CTASection.module.css'
import MainButton from '@/components/ui/MainButton/MainButton'

interface CTASectionProps {
    imageSrc?: string
    brief?: string
    title?: string
    buttonText?: string
    buttonHref?: string
}

export default function CTASection({
    imageSrc = '/projects/mrbeast-lair.png',
    brief = 'Want to take your Minecraft world to the next level?',
    title = 'Premium Minecraft Hey Builds',
    buttonText = 'Get In Touch',
    buttonHref = '/contact',
}: CTASectionProps) {
    return (
        <section
            className={styles.section}
            style={{ backgroundImage: `url(${imageSrc})` }}
        >
            <div className={styles.content}>
                <p className={styles.brief}>{brief}</p>
                <h1 className={styles.title}>{title}</h1>
                <MainButton href={buttonHref} text={buttonText} />
            </div>
        </section>
    )
}
