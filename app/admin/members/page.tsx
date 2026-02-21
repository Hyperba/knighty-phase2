'use client'

import { useState, useEffect } from 'react'
import { Search, Heart, ExternalLink } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TIER_COLORS, TIER_LABELS } from '@/lib/types/product'
import styles from './page.module.css'

interface Member {
  id: string
  handle: string
  display_name: string
  avatar_url: string
  email: string
  tier: 'explorer' | 'access' | 'builder' | 'architect' | 'admin'
  created_at: string
  total_likes: number
}

const TIERS = ['explorer', 'access', 'builder', 'architect', 'admin'] as const

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchMembers = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()

    try {
      const { data } = await supabase.rpc('admin_list_members', {
        p_search: search || null,
        p_tier: tierFilter === 'all' ? null : tierFilter,
        p_page: page,
        p_per_page: 20
      })

      if (data?.status === 'success') {
        setMembers(data.members || [])
        setTotal(data.total || 0)
        setTotalPages(data.total_pages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [search, tierFilter, page])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Members</h1>
          <p className={styles.subtitle}>{total} registered users</p>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by handle, name, or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
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
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Tier</th>
              <th>Likes</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.loading}>Loading...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>No members found</td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.memberCell}>
                      <div className={styles.memberAvatar}>
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.display_name} />
                        ) : (
                          getInitials(member.display_name || member.handle)
                        )}
                      </div>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberHandle}>@{member.handle}</span>
                        <span className={styles.memberName}>{member.display_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.emailCell}>{member.email}</td>
                  <td>
                    <span
                      className={styles.tierBadge}
                      style={{ background: TIER_COLORS[member.tier] }}
                    >
                      {TIER_LABELS[member.tier]}
                    </span>
                  </td>
                  <td>
                    <span className={styles.likesCell}>
                      <Heart size={14} />
                      {member.total_likes}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{formatDate(member.created_at)}</td>
                  <td>
                    <a
                      href={`/${member.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.visitBtn}
                    >
                      <ExternalLink size={14} />
                      Visit
                    </a>
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
