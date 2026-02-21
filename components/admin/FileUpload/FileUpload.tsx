'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileIcon, Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './FileUpload.module.css'

interface FileUploadProps {
  bucket: string
  folder?: string
  accept?: string
  maxSize?: number
  value?: string
  onChange: (url: string) => void
  label?: string
  hint?: string
}

export default function FileUpload({
  bucket,
  folder = '',
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024,
  value,
  onChange,
  label,
  hint
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ensureBucketExists = async (supabase: ReturnType<typeof getSupabaseBrowserClient>) => {
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === bucket)
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: maxSize
      })
    }
  }

  const uploadFile = async (file: File) => {
    if (file.size > maxSize) {
      setError(`File too large. Max size is ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      
      await ensureBucketExists(supabase)

      const ext = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const fileName = `${timestamp}-${randomStr}.${ext}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onChange(publicUrl)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const clearFile = () => {
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const isImage = accept.includes('image')

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      
      {value ? (
        <div className={styles.preview}>
          {isImage ? (
            <img src={value} alt="Preview" className={styles.previewImage} />
          ) : (
            <div className={styles.previewFile}>
              <FileIcon size={24} />
              <span className={styles.previewUrl}>{value.split('/').pop()}</span>
            </div>
          )}
          <button type="button" className={styles.clearBtn} onClick={clearFile}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${uploading ? styles.uploading : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className={styles.input}
          />
          {uploading ? (
            <>
              <Loader2 size={24} className={styles.spinner} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={24} />
              <span>Click or drag to upload</span>
              {hint && <span className={styles.hint}>{hint}</span>}
            </>
          )}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.urlInput}>
        <span className={styles.orText}>or paste URL:</span>
        <input
          type="url"
          placeholder="https://..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={styles.urlField}
        />
      </div>
    </div>
  )
}
