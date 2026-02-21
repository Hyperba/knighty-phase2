'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, Edit, Trash2, Eye, EyeOff, Heart, Download, ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { 
  TIER_COLORS, 
  TIER_LABELS, 
  BUILD_TYPE_LABELS, 
  THEME_CATEGORY_LABELS, 
  DIFFICULTY_LABELS 
} from '@/lib/types/product'
import styles from './page.module.css'

interface AdminProduct {
  id: string
  slug: string
  title: string
  subtitle: string
  image_url: string
  build_type: string
  theme_category: string
  difficulty: string
  tier: 'explorer' | 'access' | 'builder' | 'architect' | 'admin'
  is_published: boolean
  created_at: string
  updated_at: string
  total_likes: number
  download_count: number
}

const BUILD_TYPES = Object.keys(BUILD_TYPE_LABELS) as Array<keyof typeof BUILD_TYPE_LABELS>
const THEME_CATEGORIES = Object.keys(THEME_CATEGORY_LABELS) as Array<keyof typeof THEME_CATEGORY_LABELS>
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>
const TIERS = ['explorer', 'access', 'builder', 'architect'] as const

type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'popular'

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function AdminBuildsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [themeFilter, setThemeFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchProducts = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_list_products', {
        p_search: search || null,
        p_is_published: statusFilter === 'all' ? null : statusFilter === 'published',
        p_page: 1,
        p_per_page: 500
      })

      if (data?.status === 'success') {
        let filtered = data.products || []
        
        if (typeFilter !== 'all') {
          filtered = filtered.filter((p: AdminProduct) => p.build_type === typeFilter)
        }
        if (themeFilter !== 'all') {
          filtered = filtered.filter((p: AdminProduct) => p.theme_category === themeFilter)
        }
        if (difficultyFilter !== 'all') {
          filtered = filtered.filter((p: AdminProduct) => p.difficulty === difficultyFilter)
        }
        if (tierFilter !== 'all') {
          filtered = filtered.filter((p: AdminProduct) => p.tier === tierFilter)
        }
        
        filtered.sort((a: AdminProduct, b: AdminProduct) => {
          switch (sortBy) {
            case 'oldest':
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            case 'title_asc':
              return a.title.localeCompare(b.title)
            case 'title_desc':
              return b.title.localeCompare(a.title)
            case 'popular':
              return b.total_likes - a.total_likes
            default:
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
        })
        
        const totalFiltered = filtered.length
        const startIndex = (page - 1) * 20
        const paginatedProducts = filtered.slice(startIndex, startIndex + 20)
        
        setProducts(paginatedProducts)
        setTotal(totalFiltered)
        setTotalPages(Math.ceil(totalFiltered / 20))
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [search, statusFilter, typeFilter, themeFilter, difficultyFilter, tierFilter, sortBy, page])

  const togglePublished = async (product: AdminProduct) => {
    const supabase = getSupabaseBrowserClient()

    try {
      await supabase.rpc('admin_update_product', {
        p_id: product.id,
        p_is_published: !product.is_published
      })
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_published: !p.is_published } : p
      ))
    } catch (err) {
      console.error('Failed to toggle publish status:', err)
    }
  }

  const deleteProduct = async (product: AdminProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.title}"? This cannot be undone.`)) return

    const supabase = getSupabaseBrowserClient()

    try {
      await supabase.rpc('admin_delete_product', { p_id: product.id })
      setProducts(prev => prev.filter(p => p.id !== product.id))
      setTotal(prev => prev - 1)
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>All Builds</h1>
          <p className={styles.subtitle}>{total} total builds</p>
        </div>
        <Link href="/admin/publish-build" className={styles.publishBtn}>
          <Plus size={16} />
          Publish New
        </Link>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search builds..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Types</option>
          {BUILD_TYPES.map(type => (
            <option key={type} value={type}>{BUILD_TYPE_LABELS[type]}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={themeFilter}
          onChange={(e) => { setThemeFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Themes</option>
          {THEME_CATEGORIES.map(theme => (
            <option key={theme} value={theme}>{THEME_CATEGORY_LABELS[theme]}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Difficulties</option>
          {DIFFICULTIES.map(diff => (
            <option key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Tiers</option>
          {TIERS.map(tier => (
            <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortOption); setPage(1); }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="title_asc">Title A-Z</option>
          <option value="title_desc">Title Z-A</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Build</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Stats</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.loading}>Loading...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>No builds found</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className={styles.buildCell}>
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className={styles.buildImage}
                        />
                      ) : (
                        <div className={styles.buildImagePlaceholder} />
                      )}
                      <div className={styles.buildInfo}>
                        <span className={styles.buildTitle}>{product.title}</span>
                        <span className={styles.buildSlug}>/{product.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className={styles.tierBadge}
                      style={{ backgroundColor: TIER_COLORS[product.tier] }}
                    >
                      {TIER_LABELS[product.tier]}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${product.is_published ? styles.published : styles.draft}`}>
                      {product.is_published ? (
                        <><Eye size={12} /> Published</>
                      ) : (
                        <><EyeOff size={12} /> Draft</>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className={styles.statsCell}>
                      <span className={styles.stat}>
                        <Heart size={14} /> {product.total_likes}
                      </span>
                      <span className={styles.stat}>
                        <Download size={14} /> {product.download_count}
                      </span>
                    </div>
                  </td>
                  <td>{formatDate(product.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      <a
                        href={`/builds/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.actionBtn} ${styles.view}`}
                        title="View on site"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <Link
                        href={`/admin/builds/${product.id}`}
                        className={`${styles.actionBtn} ${styles.edit}`}
                        title="Edit"
                      >
                        <Edit size={14} />
                      </Link>
                      <button
                        className={`${styles.actionBtn} ${styles.toggle}`}
                        onClick={() => togglePublished(product)}
                        title={product.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {product.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.delete}`}
                        onClick={() => deleteProduct(product)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
