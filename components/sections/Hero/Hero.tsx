'use client'

import { useState, useEffect } from 'react'
import styles from './Hero.module.css'
import Button from '@/components/ui/MainButton/MainButton'
import Carousel from '@/components/ui/Carousel/Carousel'

const projectImages = [
    '/projects/hall-of-fame-resort.png',
    '/projects/head-in-clouds.png',
    '/projects/mrbeast-lair.png',
    '/projects/the-explorer.png',
]

export default function Hero() {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % projectImages.length)
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    return (
        <section className={styles.hero}>
            <div className={styles.backgroundSlideshow}>
                {projectImages.map((image, index) => (
                    <div
                        key={index}
                        className={`${styles.backgroundImage} ${
                            index === currentImageIndex ? styles.active : ''
                        }`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))}
                <div className={styles.overlay} />
            </div>

            <div className={styles.content}>
                <div className={styles.textContent}>
                    <p className={styles.tagline}>The Builds Catalog</p>
                    <h1 className={styles.title}>
                        DISCOVER PREMIUM<br />MINECRAFT BUILDS
                    </h1>
                    <Button text="Browse Builds" href='/builds'/>
                </div>

                <Carousel />
            </div>
        </section>
    )
}
