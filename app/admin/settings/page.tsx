'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, RefreshCw } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function AdminSettingsPage() {
  const [blockedHandles, setBlockedHandles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [newHandle, setNewHandle] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchBlockedHandles = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_list_blocked_handles')

      if (data?.status === 'success') {
        setBlockedHandles(data.handles || [])
      }
    } catch (err) {
      console.error('Failed to fetch blocked handles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBlockedHandles()
  }, [])

  const addBlockedHandle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHandle.trim() || adding) return

    setAdding(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_add_blocked_handle', { p_word: newHandle.trim() })

      if (data?.status === 'added') {
        setBlockedHandles(prev => [...prev, data.word].sort())
        setNewHandle('')
      } else if (data?.message) {
        alert(data.message)
      }
    } catch (err) {
      console.error('Failed to add blocked handle:', err)
    } finally {
      setAdding(false)
    }
  }

  const removeBlockedHandle = async (word: string) => {
    if (!confirm(`Are you sure you want to remove "${word}" from the blocklist?`)) return

    const supabase = getSupabaseBrowserClient()

    try {
      await supabase.rpc('admin_remove_blocked_handle', { p_word: word })
      setBlockedHandles(prev => prev.filter(h => h !== word))
    } catch (err) {
      console.error('Failed to remove blocked handle:', err)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage platform configuration</p>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Shield size={20} />
          </div>
          <div>
            <h2 className={styles.sectionTitle}>Blocked Handles</h2>
            <p className={styles.sectionDescription}>
              Words that cannot be used in usernames. Users cannot register handles containing these words.
            </p>
          </div>
          <button className={styles.refreshBtn} onClick={fetchBlockedHandles} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
        </div>

        <form className={styles.addForm} onSubmit={addBlockedHandle}>
          <input
            type="text"
            placeholder="Enter word to block..."
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            className={styles.addInput}
          />
          <button type="submit" className={styles.addBtn} disabled={adding || !newHandle.trim()}>
            <Plus size={16} />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div className={styles.handlesList}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : blockedHandles.length === 0 ? (
            <div className={styles.empty}>No blocked handles</div>
          ) : (
            blockedHandles.map((handle) => (
              <div key={handle} className={styles.handleItem}>
                <span className={styles.handleText}>{handle}</span>
                <button 
                  className={styles.removeBtn}
                  onClick={() => removeBlockedHandle(handle)}
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <p className={styles.handleCount}>
          {blockedHandles.length} word{blockedHandles.length !== 1 ? 's' : ''} blocked
        </p>
      </section>
    </div>
  )
}
