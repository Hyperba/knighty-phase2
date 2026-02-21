'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal'
import styles from './Navbar.module.css'

export default function Navbar() {
    const router = useRouter()
    const pathname = usePathname()
    const { user, profile, loading: authLoading, signOut } = useAuth()

    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)
    const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const [showSignOutModal, setShowSignOutModal] = useState(false)

    const isScrolledRef = useRef(false)
    const rafIdRef = useRef<number | null>(null)
    const aboutDropdownRef = useRef<HTMLDivElement>(null)

    const isLoggedIn = !authLoading && !!user

    const toggleMenu = () => setIsMenuOpen(prev => !prev)
    const closeMenu = () => {
        setIsMenuOpen(false)
        setAboutDropdownOpen(false)
    }

    const scrollToTopNow = () => {
        const lenis = (window as any).__lenis
        if (lenis && typeof lenis.scrollTo === 'function') {
            lenis.scrollTo(0, { immediate: false })
            return
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/builds?q=${encodeURIComponent(searchQuery.trim())}`)
            setSearchQuery('')
            closeMenu()
        }
    }

    const handleSignOutClick = () => {
        setShowSignOutModal(true)
    }

    const handleConfirmSignOut = async () => {
        setShowSignOutModal(false)
        try {
            await signOut()
        } catch {
            // Sign out may fail if session already invalid - ignore
        }
        closeMenu()
        router.push('/')
    }

    const handleCancelSignOut = () => {
        setShowSignOutModal(false)
    }

    useEffect(() => {
        const ENTER_Y = 80
        const EXIT_Y = 40

        const update = () => {
            rafIdRef.current = null
            const y = window.scrollY || 0
            const next = isScrolledRef.current ? y > EXIT_Y : y > ENTER_Y

            if (next !== isScrolledRef.current) {
                isScrolledRef.current = next
                setIsScrolled(next)
            }
        }

        const onScroll = () => {
            if (rafIdRef.current !== null) return
            rafIdRef.current = window.requestAnimationFrame(update)
        }

        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            window.removeEventListener('scroll', onScroll)
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current)
                rafIdRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(e.target as Node)) {
                setAboutDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
        closeMenu()
        if (href === pathname) {
            e.preventDefault()
            scrollToTopNow()
        }
    }

    return (
        <nav className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ''} ${isMenuOpen ? styles.navbarMenuOpen : ''}`}>
            <Link href="/" className={styles.brand} onClick={handleLinkClick('/')}>
                <img src="/knighty-logo.png" alt="Knighty Builds" />
            </Link>

            <form className={`${styles.searchBar} ${searchFocused ? styles.searchBarFocused : ''}`} onSubmit={handleSearch}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search for any build..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={styles.searchInput}
                />
            </form>

            <button
                type="button"
                className={`${styles.menuToggle} ${isMenuOpen ? styles.menuToggleActive : ''}`}
                aria-label="Toggle navigation"
                aria-expanded={isMenuOpen}
                onClick={toggleMenu}
            >
                <span className={styles.menuToggleLine} />
                <span className={styles.srOnly}>
                    {isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                </span>
            </button>

            <div className={`${styles.navTray} ${isMenuOpen ? styles.navTrayOpen : ''}`}>
                <ul className={styles.navList}>
                    <li className={styles.navItem}>
                        <div className={styles.dropdownWrapper} ref={aboutDropdownRef}>
                            <button
                                type="button"
                                className={`${styles.navLink} ${styles.dropdownTrigger}`}
                                onClick={() => setAboutDropdownOpen(prev => !prev)}
                                aria-expanded={aboutDropdownOpen}
                            >
                                <span>ABOUT</span>
                                <ChevronDown size={16} className={`${styles.dropdownIcon} ${aboutDropdownOpen ? styles.dropdownIconOpen : ''}`} />
                            </button>
                            <div className={`${styles.dropdown} ${aboutDropdownOpen ? styles.dropdownOpen : ''}`}>
                                <Link href="/about" className={styles.dropdownItem} onClick={handleLinkClick('/about')}>
                                    About Knighty
                                </Link>
                                <Link href="/portfolio" className={styles.dropdownItem} onClick={handleLinkClick('/portfolio')}>
                                    Builds Portfolio
                                </Link>
                                {isLoggedIn ? (
                                    <Link href="/pricing" className={styles.dropdownItem} onClick={handleLinkClick('/pricing')}>
                                        Pricing
                                    </Link>
                                ) : (
                                    <Link href="/contact" className={styles.dropdownItem} onClick={handleLinkClick('/contact')}>
                                        Get In Touch
                                    </Link>
                                )}
                            </div>
                        </div>
                    </li>

                    <li className={styles.navItem}>
                        <Link href="/builds" className={styles.navLink} onClick={handleLinkClick('/builds')}>
                            <span>BROWSE</span>
                        </Link>
                    </li>

                    {isLoggedIn ? (
                        <>
                            <li className={styles.navItem}>
                                <Link href="/my-builds" className={styles.navLink} onClick={handleLinkClick('/my-builds')}>
                                    <span>MY BUILDS</span>
                                </Link>
                            </li>
                            <li className={styles.navItem}>
                                <Link href="/settings" className={styles.navLink} onClick={handleLinkClick('/settings')}>
                                    <span>SETTINGS</span>
                                </Link>
                            </li>
                        </>
                    ) : (
                        <li className={styles.navItem}>
                            <Link href="/pricing" className={styles.navLink} onClick={handleLinkClick('/pricing')}>
                                <span>PRICING</span>
                            </Link>
                        </li>
                    )}
                </ul>

                <div className={styles.ctaWrapper}>
                    {isLoggedIn ? (
                        <>
                            <Link href="/contact" className={styles.ctaButton} onClick={handleLinkClick('/contact')}>
                                Get In Touch
                            </Link>
                            <button type="button" onClick={handleSignOutClick} className={styles.signOutButton}>
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className={styles.loginButton} onClick={handleLinkClick('/login')}>
                                Log In
                            </Link>
                            <Link href="/signup" className={styles.signupButton} onClick={handleLinkClick('/signup')}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div
                className={`${styles.scrim} ${isMenuOpen ? styles.scrimVisible : ''}`}
                onClick={closeMenu}
                aria-hidden="true"
            />

            <ConfirmModal
                isOpen={showSignOutModal}
                title="Sign Out"
                message="Are you sure you want to sign out? You'll need to log in again to access your builds."
                confirmText="Sign Out"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleConfirmSignOut}
                onCancel={handleCancelSignOut}
            />
        </nav>
    )
}