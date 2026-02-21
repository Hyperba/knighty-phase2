'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Save, Trash2, ArrowLeft, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { 
  BUILD_TYPE_LABELS, 
  THEME_CATEGORY_LABELS, 
  DIFFICULTY_LABELS,
  TIER_LABELS 
} from '@/lib/types/product'
import FileUpload from '@/components/admin/FileUpload/FileUpload'
import styles from '../page.module.css'
import formStyles from '../../publish-build/page.module.css'

const BUILD_TYPES = Object.keys(BUILD_TYPE_LABELS) as Array<keyof typeof BUILD_TYPE_LABELS>
const THEME_CATEGORIES = Object.keys(THEME_CATEGORY_LABELS) as Array<keyof typeof THEME_CATEGORY_LABELS>
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>
const TIERS = ['explorer', 'access', 'builder', 'architect'] as const

export default function AdminEditBuildPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    slug: '',
    description: '',
    image_url: '',
    tags: [] as string[],
    build_type: 'other' as keyof typeof BUILD_TYPE_LABELS,
    theme_category: 'other' as keyof typeof THEME_CATEGORY_LABELS,
    difficulty: 'medium' as keyof typeof DIFFICULTY_LABELS,
    tier: 'explorer' as typeof TIERS[number],
    download_url: '',
    guide_url: '',
    minimum_likes: 0,
    is_published: true
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    const fetchProduct = async () => {
      const supabase = getSupabaseBrowserClient()

      try {
        const { data } = await supabase.rpc('admin_get_product', { p_id: productId })

        if (data?.status === 'success' && data.product) {
          const p = data.product
          setFormData({
            title: p.title || '',
            subtitle: p.subtitle || '',
            slug: p.slug || '',
            description: p.description || '',
            image_url: p.image_url || '',
            tags: p.tags || [],
            build_type: p.build_type || 'other',
            theme_category: p.theme_category || 'other',
            difficulty: p.difficulty || 'medium',
            tier: p.tier || 'explorer',
            download_url: p.download_url || '',
            guide_url: p.guide_url || '',
            minimum_likes: p.minimum_likes || 0,
            is_published: p.is_published ?? true
          })
        } else {
          setError('Product not found')
        }
      } catch (err) {
        console.error('Failed to fetch product:', err)
        setError('Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId])

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !formData.tags.includes(tag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()

      const { data } = await supabase.rpc('admin_update_product', {
        p_id: productId,
        p_title: formData.title,
        p_subtitle: formData.subtitle,
        p_slug: formData.slug,
        p_description: formData.description,
        p_image_url: formData.image_url,
        p_tags: formData.tags,
        p_build_type: formData.build_type,
        p_theme_category: formData.theme_category,
        p_difficulty: formData.difficulty,
        p_tier: formData.tier,
        p_download_url: formData.download_url,
        p_guide_url: formData.guide_url,
        p_minimum_likes: formData.minimum_likes,
        p_is_published: formData.is_published
      })

      if (data?.status === 'error') {
        setError(data.message || 'Failed to update build')
        return
      }

      if (data?.status === 'updated') {
        setSuccess('Build updated successfully!')
      }
    } catch (err) {
      console.error('Failed to update build:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this build? This cannot be undone.')) return

    const supabase = getSupabaseBrowserClient()

    try {
      await supabase.rpc('admin_delete_product', { p_id: productId })
      router.push('/admin/builds')
    } catch (err) {
      console.error('Failed to delete build:', err)
      setError('Failed to delete build')
    }
  }

  if (loading) {
    return (
      <div className={formStyles.page}>
        <div className={formStyles.loading}>Loading...</div>
      </div>
    )
  }

  return (
    <div className={formStyles.page}>
      <header className={formStyles.header}>
        <Link href="/admin/builds" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} />
          Back to Builds
        </Link>
        <h1 className={formStyles.title}>Edit Build</h1>
        <p className={formStyles.subtitle}>Update build details</p>
      </header>

      {error && <div className={formStyles.error}>{error}</div>}
      {success && <div className={formStyles.success}>{success}</div>}

      <form className={formStyles.form} onSubmit={handleSubmit}>
        <section className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Basic Information</h2>
          
          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Title <span className={formStyles.required}>*</span></label>
            <input
              type="text"
              className={formStyles.input}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Subtitle</label>
            <input
              type="text"
              className={formStyles.input}
              value={formData.subtitle}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
            />
          </div>

          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Slug <span className={formStyles.required}>*</span></label>
            <input
              type="text"
              className={formStyles.input}
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              required
            />
            <span className={formStyles.hint}>URL: /builds/{formData.slug}</span>
          </div>

          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Description</label>
            <textarea
              className={formStyles.textarea}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </section>

        <section className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Media & Files</h2>
          
          <div className={formStyles.fieldGroup}>
            <FileUpload
              label="Build Image"
              bucket="build-images"
              folder="thumbnails"
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              value={formData.image_url}
              onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
              hint="PNG, JPG, WebP up to 5MB"
            />
          </div>

          <div className={formStyles.fieldGroup}>
            <FileUpload
              label="Download File"
              bucket="build-downloads"
              folder="files"
              accept=".zip,.rar,.7z,.schematic,.schem,.litematic,.nbt"
              maxSize={50 * 1024 * 1024}
              value={formData.download_url}
              onChange={(url) => setFormData(prev => ({ ...prev, download_url: url }))}
              hint="ZIP, schematic, litematic up to 50MB"
            />
          </div>

          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Guide URL</label>
            <input
              type="url"
              className={formStyles.input}
              value={formData.guide_url}
              onChange={(e) => setFormData(prev => ({ ...prev, guide_url: e.target.value }))}
              placeholder="https://... (optional Notion/Google Docs link)"
            />
          </div>
        </section>

        <section className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Classification</h2>
          
          <div className={formStyles.fieldRow}>
            <div className={formStyles.fieldGroup}>
              <label className={formStyles.label}>Build Type</label>
              <select
                className={formStyles.select}
                value={formData.build_type}
                onChange={(e) => setFormData(prev => ({ ...prev, build_type: e.target.value as typeof formData.build_type }))}
              >
                {BUILD_TYPES.map(type => (
                  <option key={type} value={type}>{BUILD_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>

            <div className={formStyles.fieldGroup}>
              <label className={formStyles.label}>Theme</label>
              <select
                className={formStyles.select}
                value={formData.theme_category}
                onChange={(e) => setFormData(prev => ({ ...prev, theme_category: e.target.value as typeof formData.theme_category }))}
              >
                {THEME_CATEGORIES.map(theme => (
                  <option key={theme} value={theme}>{THEME_CATEGORY_LABELS[theme]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={formStyles.fieldRow}>
            <div className={formStyles.fieldGroup}>
              <label className={formStyles.label}>Difficulty</label>
              <select
                className={formStyles.select}
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as typeof formData.difficulty }))}
              >
                {DIFFICULTIES.map(diff => (
                  <option key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</option>
                ))}
              </select>
            </div>

            <div className={formStyles.fieldGroup}>
              <label className={formStyles.label}>Access Tier</label>
              <select
                className={formStyles.select}
                value={formData.tier}
                onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value as typeof formData.tier }))}
              >
                {TIERS.map(tier => (
                  <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Tags</label>
            <div className={formStyles.tagsInput}>
              {formData.tags.map(tag => (
                <span key={tag} className={formStyles.tag}>
                  {tag}
                  <button type="button" className={formStyles.tagRemove} onClick={() => handleRemoveTag(tag)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={formStyles.tagInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and press Enter..."
              />
            </div>
          </div>
        </section>

        <section className={formStyles.section}>
          <h2 className={formStyles.sectionTitle}>Settings</h2>
          
          <div className={formStyles.fieldGroup}>
            <label className={formStyles.label}>Minimum Likes (Social Proof)</label>
            <input
              type="number"
              className={formStyles.input}
              value={formData.minimum_likes}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_likes: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className={formStyles.checkboxGroup}>
            <input
              type="checkbox"
              id="is_published"
              className={formStyles.checkbox}
              checked={formData.is_published}
              onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
            />
            <label htmlFor="is_published" className={formStyles.checkboxLabel}>
              Published
            </label>
          </div>
        </section>

        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.submitBtn} disabled={submitting}>
            <Save size={16} />
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className={formStyles.cancelBtn} onClick={handleDelete} style={{ color: 'var(--admin-danger)' }}>
            <Trash2 size={16} />
            Delete Build
          </button>
        </div>
      </form>
    </div>
  )
}
