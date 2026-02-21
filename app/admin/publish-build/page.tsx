'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { 
  BUILD_TYPE_LABELS, 
  THEME_CATEGORY_LABELS, 
  DIFFICULTY_LABELS,
  TIER_LABELS 
} from '@/lib/types/product'
import FileUpload from '@/components/admin/FileUpload/FileUpload'
import styles from './page.module.css'

const BUILD_TYPES = Object.keys(BUILD_TYPE_LABELS) as Array<keyof typeof BUILD_TYPE_LABELS>
const THEME_CATEGORIES = Object.keys(THEME_CATEGORY_LABELS) as Array<keyof typeof THEME_CATEGORY_LABELS>
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Array<keyof typeof DIFFICULTY_LABELS>
const TIERS = ['explorer', 'access', 'builder', 'architect'] as const

export default function AdminPublishBuildPage() {
  const router = useRouter()
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

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }))
  }

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

      const { data } = await supabase.rpc('admin_create_product', {
        p_title: formData.title,
        p_subtitle: formData.subtitle,
        p_slug: formData.slug || generateSlug(formData.title),
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
        setError(data.message || 'Failed to create build')
        return
      }

      if (data?.status === 'created') {
        setSuccess('Build created successfully!')
        setTimeout(() => {
          router.push('/admin/builds')
        }, 1500)
      }
    } catch (err) {
      console.error('Failed to create build:', err)
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Publish New Build</h1>
        <p className={styles.subtitle}>Create and publish a new Minecraft build</p>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>
          
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="e.g., Medieval Castle"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Subtitle</label>
            <input
              type="text"
              className={styles.input}
              value={formData.subtitle}
              onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
              placeholder="A brief tagline for the build"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Slug <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="medieval-castle"
              required
            />
            <span className={styles.hint}>URL: /builds/{formData.slug || 'your-slug'}</span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the build..."
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Media & Files</h2>
          
          <div className={styles.fieldGroup}>
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

          <div className={styles.fieldGroup}>
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

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Guide URL</label>
            <input
              type="url"
              className={styles.input}
              value={formData.guide_url}
              onChange={(e) => setFormData(prev => ({ ...prev, guide_url: e.target.value }))}
              placeholder="https://... (optional Notion/Google Docs link)"
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Classification</h2>
          
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Build Type</label>
              <select
                className={styles.select}
                value={formData.build_type}
                onChange={(e) => setFormData(prev => ({ ...prev, build_type: e.target.value as typeof formData.build_type }))}>
                {BUILD_TYPES.map(type => (
                  <option key={type} value={type}>{BUILD_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Theme</label>
              <select
                className={styles.select}
                value={formData.theme_category}
                onChange={(e) => setFormData(prev => ({ ...prev, theme_category: e.target.value as typeof formData.theme_category }))}>
                {THEME_CATEGORIES.map(theme => (
                  <option key={theme} value={theme}>{THEME_CATEGORY_LABELS[theme]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Difficulty</label>
              <select
                className={styles.select}
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as typeof formData.difficulty }))}>
                {DIFFICULTIES.map(diff => (
                  <option key={diff} value={diff}>{DIFFICULTY_LABELS[diff]}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Access Tier</label>
              <select
                className={styles.select}
                value={formData.tier}
                onChange={(e) => setFormData(prev => ({ ...prev, tier: e.target.value as typeof formData.tier }))}>
                {TIERS.map(tier => (
                  <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tags</label>
            <div className={styles.tagsInput}>
              {formData.tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button 
                    type="button" 
                    className={styles.tagRemove}
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInput}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and press Enter..."
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Settings</h2>
          
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Minimum Likes (Social Proof)</label>
            <input
              type="number"
              className={styles.input}
              value={formData.minimum_likes}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_likes: parseInt(e.target.value) || 0 }))}
              min="0"
            />
            <span className={styles.hint}>Base like count displayed (real likes are added on top)</span>
          </div>

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="is_published"
              className={styles.checkbox}
              checked={formData.is_published}
              onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
            />
            <label htmlFor="is_published" className={styles.checkboxLabel}>
              Publish immediately
            </label>
          </div>
        </section>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            <Save size={16} />
            {submitting ? 'Publishing...' : 'Publish Build'}
          </button>
          <Link href="/admin/builds" className={styles.cancelBtn}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
