'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import styles from './QuickAction.module.css'

interface QuickActionProps {
  title: string
  description: string
  icon: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'default' | 'primary'
}

export default function QuickAction({ 
  title, 
  description, 
  icon, 
  href, 
  onClick,
  variant = 'default'
}: QuickActionProps) {
  const content = (
    <div className={`${styles.action} ${styles[variant]}`}>
      <div className={styles.iconWrapper}>
        {icon}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return (
    <button className={styles.button} onClick={onClick}>
      {content}
    </button>
  )
}
