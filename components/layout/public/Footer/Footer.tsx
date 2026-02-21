'use client'

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import styles from './Footer.module.css'
import Link from 'next/link'
import { CheckCircle2, Mail, TriangleAlert } from 'lucide-react'
import MainButton from '@/components/ui/MainButton/MainButton'
import StatusModal, { type StatusModalVariant } from '@/components/ui/StatusModal/StatusModal'

export default function Footer() {
    const [email, setEmail] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [modalHeading, setModalHeading] = useState('')
    const [modalDescription, setModalDescription] = useState<string | undefined>(undefined)
    const [modalVariant, setModalVariant] = useState<StatusModalVariant>('info')
    const [modalIcon, setModalIcon] = useState<ReactNode>(null)

    const openModal = (next: {
        heading: string
        description?: string
        variant: StatusModalVariant
        icon: ReactNode
    }) => {
        setModalHeading(next.heading)
        setModalDescription(next.description)
        setModalVariant(next.variant)
        setModalIcon(next.icon)
        setModalOpen(true)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 429 && data?.status === 'rate_limited') {
                    openModal({
                        heading: 'Please wait',
                        description: data?.error || 'You can only subscribe once every 3 minutes.',
                        variant: 'info',
                        icon: <TriangleAlert size={24} />,
                    })
                    return
                }

                openModal({
                    heading: 'Subscription failed',
                    description: data?.error || 'Please try again.',
                    variant: 'error',
                    icon: <TriangleAlert size={24} />,
                })
                return
            }

            if (data?.status === 'exists') {
                openModal({
                    heading: 'Already subscribed',
                    description: data?.message || 'This email is already subscribed.',
                    variant: 'info',
                    icon: <Mail size={24} />,
                })
                return
            }

            openModal({
                heading: 'Subscribed!',
                description: 'You are now subscribed to the Knighty newsletter.',
                variant: 'success',
                icon: <CheckCircle2 size={24} />,
            })
            setEmail('')
        } catch {
            openModal({
                heading: 'Subscription failed',
                description: 'Please try again.',
                variant: 'error',
                icon: <TriangleAlert size={24} />,
            })
        }
    }

    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                <div className={styles.footerTop}>
                    <div className={styles.newsletterSection}>
                        <Link href="/" className={styles.logo}>
                            <img src="/knighty-logo.png" alt="KNIGHTY" />
                        </Link>
                        <p className={styles.newsletterText}>
                            Subscribe to be notified about new builds and sales!
                        </p>
                        <form className={styles.newsletterForm} onSubmit={handleSubmit}>

                            <input
                                type="email"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={styles.emailInput}
                                required
                            />
                            <MainButton text="Subscribe" type="submit" />
                        </form>
                    </div>

                    <StatusModal
                        open={modalOpen}
                        onClose={() => setModalOpen(false)}
                        heading={modalHeading}
                        description={modalDescription}
                        variant={modalVariant}
                        icon={modalIcon}
                    />

                    <div className={styles.linksSection}>
                        <div className={styles.linkColumn}>
                            <h3 className={styles.linkHeading}>Pages</h3>
                            <ul className={styles.linkList}>
                                <li><Link href="/">HOME</Link></li>
                                <li><Link href="/about">ABOUT</Link></li>
                                <li><Link href="/portfolio">BUILDS</Link></li>
                                <li><Link href="https://www.patreon.com/cw/knightybuilds" target="_blank" rel="noopener noreferrer">PATREON</Link></li>
                                <li><Link href="/contact">CONTACT</Link></li>
                            </ul>
                        </div>

                        <div className={styles.linkColumn}>
                            <div>
                                <h3 className={styles.linkHeading}>Discord</h3>
                                <ul className={styles.linkList}>
                                    <li><a href="https://discord.gg/xknighty" target="_blank" rel="noopener noreferrer">xknighty</a></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className={`${styles.linkHeading} ${styles.linkHeadingSpaced}`}>Email</h3>
                            <ul className={styles.linkList}>
                                <li><a href="mailto:knighty@knightybuilds.com">knighty@knightybuilds.com</a></li>
                            </ul>
                            </div>
                            <div>
                            <h3 className={`${styles.linkHeading} ${styles.linkHeadingSpaced}`}>Instagram</h3>
                            <ul className={styles.linkList}>
                                <li><a href="https://instagram.com/knightybuilds" target="_blank" rel="noopener noreferrer">@knightybuilds</a></li>
                            </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.footerBottom}>
                    <p className={styles.copyright}>© 2025</p>
                    <p className={styles.rights}>All rights reserved</p>
                </div>
            </div>
        </footer>
    )
}