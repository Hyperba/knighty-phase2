'use client'

import { useState, useEffect } from 'react'
import { Download, Trash2, Search, RefreshCw, Mail } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface Subscriber {
  id: string
  email: string
  created_at: string
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [exporting, setExporting] = useState(false)

  const fetchSubscribers = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_list_newsletter_subscribers', {
        p_search: search || null,
        p_page: page,
        p_per_page: 50
      })

      if (data?.status === 'success') {
        setSubscribers(data.subscribers || [])
        setTotal(data.total || 0)
        setTotalPages(data.total_pages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch subscribers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscribers()
  }, [search, page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSubscribers()
  }

  const removeSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to remove this subscriber?')) return

    const supabase = getSupabaseBrowserClient()
    await supabase.rpc('admin_remove_subscriber', { p_id: id })
    setSubscribers(prev => prev.filter(s => s.id !== id))
    setTotal(prev => prev - 1)
  }

  const exportToCSV = async () => {
    setExporting(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data, error } = await supabase.rpc('admin_export_newsletter_emails')

      if (error) throw error

      if (data?.status === 'success') {
        const emails = Array.isArray(data.emails) ? data.emails : []

        if (emails.length === 0) {
          alert('No subscribers to export')
          return
        }

        const csvContent = [
          'Email,Subscribed At',
          ...emails.map((e: { email: string; subscribed_at: string }) => 
            `"${(e.email || '').replace(/"/g, '""')}","${e.subscribed_at ? new Date(e.subscribed_at).toISOString() : ''}"`
          )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        throw new Error(data?.message || 'Export failed')
      }
    } catch (err: any) {
      console.error('Failed to export:', err)
      alert(err.message || 'Failed to export subscribers')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Newsletter Subscribers</h1>
          <p className={styles.subtitle}>{total.toLocaleString()} total subscribers</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={fetchSubscribers} disabled={loading}>
            <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          </button>
          <button className={styles.exportBtn} onClick={exportToCSV} disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </header>

      <form className={styles.searchForm} onSubmit={handleSearch}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Subscribed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className={styles.loading}>Loading...</td>
              </tr>
            ) : subscribers.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.empty}>No subscribers found</td>
              </tr>
            ) : (
              subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>
                    <div className={styles.emailCell}>
                      <Mail size={14} />
                      <a href={`mailto:${subscriber.email}`}>{subscriber.email}</a>
                    </div>
                  </td>
                  <td className={styles.dateCell}>{formatDate(subscriber.created_at)}</td>
                  <td>
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => removeSubscriber(subscriber.id)}
                      title="Remove subscriber"
                    >
                      <Trash2 size={14} />
                    </button>
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
