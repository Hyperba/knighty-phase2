'use client'

import { useState, useEffect } from 'react'
import { Mail, MailOpen, Archive, ArchiveRestore, ExternalLink, RefreshCw } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface ContactSubmission {
  id: string
  name: string
  email: string
  project_type: string
  message: string
  is_read: boolean
  is_archived: boolean
  created_at: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AdminMessagesPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchSubmissions = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_list_contact_submissions', {
        p_is_read: filter === 'unread' ? false : null,
        p_is_archived: filter === 'archived',
        p_page: page,
        p_per_page: 20
      })

      if (data?.status === 'success') {
        setSubmissions(data.submissions || [])
        setTotalPages(data.total_pages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [filter, page])

  const markAsRead = async (id: string, isRead: boolean) => {
    const supabase = getSupabaseBrowserClient()
    await supabase.rpc('admin_mark_submission_read', { p_id: id, p_is_read: isRead })
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: isRead } : s))
  }

  const toggleArchive = async (id: string, archive: boolean) => {
    const supabase = getSupabaseBrowserClient()
    await supabase.rpc('admin_archive_submission', { p_id: id, p_archive: archive })
    setSubmissions(prev => prev.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const selectedSubmission = submissions.find(s => s.id === selectedId)

  const handleSelect = async (submission: ContactSubmission) => {
    setSelectedId(submission.id)
    if (!submission.is_read) {
      await markAsRead(submission.id, true)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>Contact form submissions</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchSubmissions} disabled={loading}>
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </header>

      <div className={styles.filters}>
        <button 
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          All
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
          onClick={() => { setFilter('unread'); setPage(1); }}
        >
          Unread
        </button>
        <button 
          className={`${styles.filterBtn} ${filter === 'archived' ? styles.active : ''}`}
          onClick={() => { setFilter('archived'); setPage(1); }}
        >
          Archived
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : submissions.length === 0 ? (
            <div className={styles.empty}>No messages found</div>
          ) : (
            submissions.map((submission) => (
              <button
                key={submission.id}
                className={`${styles.listItem} ${selectedId === submission.id ? styles.selected : ''} ${!submission.is_read ? styles.unread : ''}`}
                onClick={() => handleSelect(submission)}
              >
                <div className={styles.listItemHeader}>
                  <span className={styles.listItemName}>{submission.name}</span>
                  <span className={styles.listItemDate}>{formatDate(submission.created_at)}</span>
                </div>
                <div className={styles.listItemType}>{submission.project_type}</div>
                <div className={styles.listItemPreview}>{submission.message.slice(0, 100)}...</div>
              </button>
            ))
          )}

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

        <div className={styles.detail}>
          {selectedSubmission ? (
            <>
              <div className={styles.detailHeader}>
                <div>
                  <h2 className={styles.detailName}>{selectedSubmission.name}</h2>
                  <a href={`mailto:${selectedSubmission.email}`} className={styles.detailEmail}>
                    {selectedSubmission.email}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <div className={styles.detailActions}>
                  <button
                    className={`${styles.actionBtn} ${selectedSubmission.is_read ? styles.actionRead : styles.actionUnread}`}
                    onClick={() => markAsRead(selectedSubmission.id, !selectedSubmission.is_read)}
                    title={selectedSubmission.is_read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {selectedSubmission.is_read ? <MailOpen size={16} /> : <Mail size={16} />}
                    <span className={styles.actionLabel}>
                      {selectedSubmission.is_read ? 'Mark Unread' : 'Mark Read'}
                    </span>
                  </button>
                  {filter === 'archived' ? (
                    <button
                      className={styles.actionBtn}
                      onClick={() => toggleArchive(selectedSubmission.id, false)}
                      title="Unarchive"
                    >
                      <ArchiveRestore size={16} />
                      <span className={styles.actionLabel}>Unarchive</span>
                    </button>
                  ) : (
                    <button
                      className={styles.actionBtn}
                      onClick={() => toggleArchive(selectedSubmission.id, true)}
                      title="Archive"
                    >
                      <Archive size={16} />
                      <span className={styles.actionLabel}>Archive</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.detailMeta}>
                <span className={styles.detailType}>{selectedSubmission.project_type}</span>
                <span className={styles.detailDate}>{formatDate(selectedSubmission.created_at)}</span>
              </div>

              <div className={styles.detailMessage}>
                {selectedSubmission.message}
              </div>

              <a 
                href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.project_type}`}
                className={styles.replyBtn}
              >
                <Mail size={16} />
                Reply via Email
              </a>
            </>
          ) : (
            <div className={styles.noSelection}>
              <Mail size={48} />
              <p>Select a message to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
