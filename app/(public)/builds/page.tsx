'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Filter, X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/contexts/AuthContext'
import BuildCard from '@/components/ui/BuildCard/BuildCard'
import type { 
  ProductCard, 
  BuildType, 
  ThemeCategory, 
  UserTier,
  BrowseResponse 
} from '@/lib/types/product'
import { 
  BUILD_TYPE_LABELS, 
  THEME_CATEGORY_LABELS, 
  TIER_LABELS 
} from '@/lib/types/product'
import styles from './page.module.css'

const BUILD_TYPES: BuildType[] = ['statues', 'houses', 'portals', 'vehicles', 'fountains', 'organics', 'asset_packs', 'maps', 'other']
const THEME_CATEGORIES: ThemeCategory[] = ['fantasy', 'medieval', 'modern', 'ancient', 'christmas', 'halloween', 'brutalist', 'sci_fi', 'nature', 'other']
const TIERS: UserTier[] = ['explorer', 'access', 'builder', 'architect']
const TIER_ORDER: Record<UserTier, number> = { explorer: 0, access: 1, builder: 2, architect: 3, admin: 4 }

function BrowseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = getSupabaseBrowserClient()

  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Memoize URL params to prevent unnecessary re-renders
  const searchQuery = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const sortBy = searchParams.get('sort') || 'newest'
  
  const selectedBuildTypes = useMemo(() => 
    (searchParams.get('types')?.split(',').filter(Boolean) || []) as BuildType[],
    [searchParams]
  )
  
  const selectedThemes = useMemo(() => 
    (searchParams.get('themes')?.split(',').filter(Boolean) || []) as ThemeCategory[],
    [searchParams]
  )
  
  const selectedTiers = useMemo(() => 
    (searchParams.get('tiers')?.split(',').filter(Boolean) || []) as UserTier[],
    [searchParams]
  )

  // Create a stable key for the current filter state
  const filterKey = useMemo(() => 
    `${searchQuery}|${selectedBuildTypes.join(',')}|${selectedThemes.join(',')}|${selectedTiers.join(',')}|${sortBy}|${page}`,
    [searchQuery, selectedBuildTypes, selectedThemes, selectedTiers, sortBy, page]
  )

  const updateURL = (params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString())
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '') {
        current.delete(key)
      } else {
        current.set(key, value)
      }
    })

    // Reset to page 1 when filters change (except when changing page itself)
    if (!('page' in params)) {
      current.delete('page')
    }

    router.replace(`/builds?${current.toString()}`, { scroll: false })
  }

  // Fetch products when filter key changes
  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      // Only show loading spinner on initial load, not filter changes
      if (initialLoad) {
        setLoading(true)
      }

      try {
        const { data, error } = await supabase.rpc('browse_products', {
          p_search: searchQuery || null,
          p_build_types: selectedBuildTypes.length > 0 ? selectedBuildTypes : null,
          p_theme_categories: selectedThemes.length > 0 ? selectedThemes : null,
          p_tiers: selectedTiers.length > 0 ? selectedTiers : null,
          p_difficulties: null,
          p_sort_by: sortBy,
          p_page: page,
          p_per_page: 12
        })

        if (cancelled) return
        if (error) throw error

        const result = data as BrowseResponse
        setProducts(result.products || [])
        setTotal(result.total)
        setTotalPages(result.total_pages)
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching products:', err)
          setProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setInitialLoad(false)
        }
      }
    }

    fetchProducts()

    return () => {
      cancelled = true
    }
  }, [filterKey, supabase, searchQuery, selectedBuildTypes, selectedThemes, selectedTiers, sortBy, page, initialLoad])

  // Handle tier toggle with cascading selection
  const toggleTier = (tier: UserTier) => {
    const tierIndex = TIER_ORDER[tier]
    const isCurrentlySelected = selectedTiers.includes(tier)
    
    if (isCurrentlySelected) {
      // Remove this tier and all tiers below it
      const updated = selectedTiers.filter(t => TIER_ORDER[t] > tierIndex)
      updateURL({ tiers: updated.length > 0 ? updated.join(',') : null })
    } else {
      // Add this tier and all tiers below it
      const tiersToAdd = TIERS.filter(t => TIER_ORDER[t] <= tierIndex)
      const newTiers = [...new Set([...selectedTiers, ...tiersToAdd])]
      updateURL({ tiers: newTiers.join(',') })
    }
  }

  // Check if a tier should be highlighted (selected or implied by higher tier selection)
  const isTierHighlighted = (tier: UserTier) => {
    if (selectedTiers.includes(tier)) return true
    // Check if any higher tier is selected
    const tierIndex = TIER_ORDER[tier]
    return selectedTiers.some(t => TIER_ORDER[t] >= tierIndex)
  }

  const toggleFilter = (type: 'types' | 'themes', value: string) => {
    let current: string[]
    if (type === 'types') current = selectedBuildTypes
    else current = selectedThemes

    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateURL({ [type]: updated.length > 0 ? updated.join(',') : null })
  }

  const clearAllFilters = () => {
    updateURL({ types: null, themes: null, tiers: null, q: null })
  }

  const hasActiveFilters = selectedBuildTypes.length > 0 || selectedThemes.length > 0 || selectedTiers.length > 0 || searchQuery

  const getActiveFilterCount = () => {
    return selectedBuildTypes.length + selectedThemes.length + (selectedTiers.length > 0 ? 1 : 0)
  }

  return (
    <main className={styles.builds}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {searchQuery ? (
            <>
              <h1 className={styles.title}>Results for "{searchQuery}"</h1>
              <p className={styles.subtitle}>{total} builds found</p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Browse Builds</h1>
              <p className={styles.subtitle}>Explore {total} premium Minecraft builds</p>
            </>
          )}
        </div>

        <div className={styles.headerActions}>
          {user && (
            <Link href="/my-builds" className={styles.myBuildsBtn}>
              <Sparkles size={16} />
              My Builds
            </Link>
          )}
          <select 
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => updateURL({ sort: e.target.value })}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most Popular</option>
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
          </select>
        </div>
      </header>

      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          <Filter size={14} />
          <span className={styles.filterCount}>{getActiveFilterCount()} active</span>
          <button onClick={clearAllFilters} className={styles.resetBtn}>
            Clear all
          </button>
        </div>
      )}

      <button 
        className={styles.mobileFilterToggle}
        onClick={() => setMobileFiltersOpen(true)}
      >
        <Filter size={16} />
        Filters
        {hasActiveFilters && <span className={styles.filterBadge}>{getActiveFilterCount()}</span>}
      </button>

      <div className={styles.content}>
        <aside className={`${styles.sidebar} ${mobileFiltersOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <span>Filters</span>
            <button onClick={() => setMobileFiltersOpen(false)} className={styles.closeSidebar}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Build Type</h3>
            <div className={styles.filterOptions}>
              {BUILD_TYPES.map(type => (
                <button
                  key={type}
                  className={`${styles.filterOption} ${selectedBuildTypes.includes(type) ? styles.filterOptionActive : ''}`}
                  onClick={() => toggleFilter('types', type)}
                >
                  <span>{BUILD_TYPE_LABELS[type]}</span>
                  {selectedBuildTypes.includes(type) && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Theme</h3>
            <div className={styles.filterOptions}>
              {THEME_CATEGORIES.map(theme => (
                <button
                  key={theme}
                  className={`${styles.filterOption} ${selectedThemes.includes(theme) ? styles.filterOptionActive : ''}`}
                  onClick={() => toggleFilter('themes', theme)}
                >
                  <span>{THEME_CATEGORY_LABELS[theme]}</span>
                  {selectedThemes.includes(theme) && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Access Tier</h3>
            <p className={styles.filterHint}>Higher tiers include all lower tiers</p>
            <div className={styles.filterOptions}>
              {TIERS.map(tier => (
                <button
                  key={tier}
                  className={`${styles.filterOption} ${styles.tierOption} ${isTierHighlighted(tier) ? styles.filterOptionActive : ''}`}
                  onClick={() => toggleTier(tier)}
                >
                  <span>{TIER_LABELS[tier]}</span>
                  {isTierHighlighted(tier) && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          {user && (
            <Link href="/my-builds" className={styles.sidebarMyBuilds}>
              <Sparkles size={14} />
              My Builds
            </Link>
          )}
        </aside>

        {mobileFiltersOpen && (
          <div className={styles.sidebarOverlay} onClick={() => setMobileFiltersOpen(false)} />
        )}

        <section className={styles.results}>
          {loading && initialLoad ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading builds...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>No builds found</h3>
              <p>Try adjusting your filters or search terms</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className={styles.clearFiltersBtn}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {products.map((product, index) => (
                  <BuildCard 
                    key={product.id} 
                    product={product}
                    priority={index < 4}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => updateURL({ page: String(page - 1) })}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className={styles.pageInfo}>
                    <span className={styles.pageNumber}>{page}</span>
                    <span className={styles.pageDivider}>/</span>
                    <span className={styles.pageTotal}>{totalPages}</span>
                  </div>
                  <button
                    className={styles.pageBtn}
                    disabled={page >= totalPages}
                    onClick={() => updateURL({ page: String(page + 1) })}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2>Looking for something custom?</h2>
          <p>Have a specific build in mind? Let's bring your vision to life.</p>
        </div>
        <Link href="/contact" className={styles.ctaBtn}>
          Request a Build
        </Link>
      </div>
    </main>
  )
}

export default function BuildsPage() {
  return (
    <Suspense fallback={
      <main className={styles.builds}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </main>
    }>
      <BrowseContent />
    </Suspense>
  )
}
