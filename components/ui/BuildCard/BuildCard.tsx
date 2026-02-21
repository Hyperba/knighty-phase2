'use client'

import { memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ArrowRight, Layers, Palette, Calendar, Package } from 'lucide-react'
import type { ProductCard, DifficultyLevel } from '@/lib/types/product'
import { BUILD_TYPE_LABELS, THEME_CATEGORY_LABELS, TIER_LABELS, TIER_COLORS, DIFFICULTY_LABELS } from '@/lib/types/product'
import styles from './BuildCard.module.css'

interface BuildCardProps {
  product: ProductCard
  priority?: boolean
}

const DIFFICULTY_LEVELS: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4
}

function BuildCard({ product, priority = false }: BuildCardProps) {
  const difficultyLevel = DIFFICULTY_LEVELS[product.difficulty]
  const createdAtLabel = new Date(product.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  return (
    <Link href={`/builds/${product.slug}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <div className={styles.imageFrame}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={styles.image}
              priority={priority}
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <Package size={32} />
            </div>
          )}
        </div>
        <div className={styles.imageOverlay}>
          <span className={styles.viewPrompt}>
            View Build
            <ArrowRight size={14} />
          </span>
        </div>
        <div className={styles.likeBadge}>
          <Heart size={14} fill="#ef4444" />
          <span>{product.total_likes.toLocaleString()}</span>
        </div>
        <span className={styles.tierBadge} style={{ backgroundColor: TIER_COLORS[product.tier] }}>
          {TIER_LABELS[product.tier]}
        </span>
      </div>
      
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{product.title}</h3>
          <p className={styles.subtitle}>{product.subtitle}</p>
        </div>

        <div className={styles.chips}>
          <span className={styles.chip}>
            <Layers size={12} />
            {BUILD_TYPE_LABELS[product.build_type]}
          </span>
          <span className={styles.chip}>
            <Palette size={12} />
            {THEME_CATEGORY_LABELS[product.theme_category]}
          </span>
          {product.tags.slice(0, 1).map(tag => (
            <span key={tag} className={styles.tagChip}>
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaGroup}>
            <span className={styles.metaLabel}>{DIFFICULTY_LABELS[product.difficulty]}</span>
            <div className={styles.difficultyBlocks}>
              {[1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className={`${styles.difficultyBlock} ${i <= difficultyLevel ? styles[`level${difficultyLevel}`] : ''}`}
                />
              ))}
            </div>
          </div>
          <div className={styles.metaGroupRight}>
            <span className={styles.date}>
              <Calendar size={12} />
              {createdAtLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default memo(BuildCard)
