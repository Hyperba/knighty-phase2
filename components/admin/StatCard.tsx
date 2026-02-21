'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import styles from './StatCard.module.css'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  iconColor?: 'green' | 'purple' | 'blue' | 'orange' | 'red'
  href?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconColor = 'green',
  href,
  trend 
}: StatCardProps) {
  const content = (
    <div className={`${styles.card} ${href ? styles.clickable : ''}`}>
      <div className={`${styles.iconWrapper} ${styles[iconColor]}`}>
        {icon}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <div className={styles.valueRow}>
          <span className={styles.value}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
          {trend && (
            <span className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
