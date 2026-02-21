'use client'

import { useEffect, useRef } from 'react'
import styles from './Carousel.module.css'
import Link from 'next/link'

interface Creator {
    name: string
    subscribers: string
    avatar: string
    link: string
}

const creators: Creator[] = [
    { name: 'Snarple', subscribers: '49.2K subscribers', avatar: '/creators/snarple.png', link: "https://www.youtube.com/@Snarple" },
    { name: 'ItsNotLudo', subscribers: '85.7K subscribers', avatar: '/creators/itsnotludo.png', link: "https://www.youtube.com/@itsnotludo" },
    { name: 'MrBeast Gaming', subscribers: '53.4M subscribers', avatar: '/creators/mrbeast-gaming.png', link: "https://www.youtube.com/@MrBeastGaming" },
    { name: 'MegRae', subscribers: '115K subscribers', avatar: '/creators/megrae.png', link: "https://www.youtube.com/@MegRae" },
]

export default function Carousel() {
    const trackRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const track = trackRef.current
        if (!track) return

        const scrollWidth = track.scrollWidth
        const clientWidth = track.clientWidth
        let scrollPos = 0

        const scroll = () => {
            scrollPos += 0.5
            if (scrollPos >= scrollWidth / 2) {
                scrollPos = 0
            }
            track.scrollLeft = scrollPos
        }

        const interval = setInterval(scroll, 20)
        return () => clearInterval(interval)
    }, [])

    const duplicatedCreators = [...creators, ...creators, ...creators]

    return (
        <div className={styles.carouselContainer}>
            <p className={styles.label}>Work seen on:</p>
            <div className={styles.carousel} ref={trackRef}>
                <div className={styles.track}>
                    {duplicatedCreators.map((creator, index) => (
                        <Link href={creator.link} target='_blank' key={index} className={styles.creatorCard}>
                            <img 
                                src={creator.avatar} 
                                alt={creator.name}
                                className={styles.avatar}
                            />
                            <div className={styles.info}>
                                <p className={styles.name}>{creator.name}</p>
                                <p className={styles.subscribers}>{creator.subscribers}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
