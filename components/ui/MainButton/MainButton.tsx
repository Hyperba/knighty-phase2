import styles from './MainButton.module.css'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface MainButtonProps {
    text?: string
    href?: string
    type?: 'button' | 'submit' | 'reset'
    onClick?: () => void
}

export default function Button({ text = "Get in Touch", href = "#", type = 'button', onClick }: MainButtonProps) {
    const content = (
        <span className={styles.content}>
            {text}
            <span className={styles.arrow}>
                <ArrowRight size={14} />
            </span>
        </span>
    )

    if (type !== 'button') {
        return (
            <button type={type} className={`${styles.btn} ${styles.btnAnimated}`} onClick={onClick}>
                {content}
            </button>
        )
    }

    return (
        <Link href={href}>
            <button type="button" className={`${styles.btn} ${styles.btnAnimated}`} onClick={onClick}>
                {content}
            </button>
        </Link>
    )
}
