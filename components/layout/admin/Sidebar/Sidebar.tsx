'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Mail,
  Newspaper,
  PlusCircle,
  ChevronDown,
  Shield,
  Home,
  ExternalLink,
  DollarSign,
  Star
} from 'lucide-react'
import { useAuth } from '@/components/contexts/AuthContext'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal/ConfirmModal'
import styles from './Sidebar.module.css'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface NavGroup {
  id: string
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['content', 'communication'])
  const [showSignOutModal, setShowSignOutModal] = useState(false)

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user) return
      
      try {
        const supabase = getSupabaseBrowserClient()
        const { data } = await supabase.rpc('admin_get_dashboard_stats')
        
        if (data?.status === 'success' && data.stats) {
          setUnreadMessages(data.stats.unread_messages || 0)
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err)
      }
    }

    fetchUnreadCount()
  }, [user])

  const topNavItems: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  ]

  const navGroups: NavGroup[] = [
    {
      id: 'content',
      label: 'Content',
      icon: <Package size={18} />,
      items: [
        { href: '/admin/builds', label: 'All Builds', icon: <Package size={16} /> },
        { href: '/admin/publish-build', label: 'Publish New', icon: <PlusCircle size={16} /> },
      ]
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: <Mail size={18} />,
      items: [
        { href: '/admin/messages', label: 'Messages', icon: <Mail size={16} />, badge: unreadMessages > 0 ? unreadMessages : undefined },
        { href: '/admin/newsletter', label: 'Newsletter', icon: <Newspaper size={16} /> },
        { href: '/admin/reviews', label: 'Reviews', icon: <Star size={16} /> },
      ]
    },
  ]

  const bottomNavItems: NavItem[] = [
    { href: '/admin/members', label: 'Members', icon: <Users size={18} /> },
    { href: '/admin/pricing', label: 'Pricing', icon: <DollarSign size={18} /> },
    { href: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSignOut = async () => {
    setShowSignOutModal(false)
    await signOut()
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <>
      <button 
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div 
        className={`${styles.overlay} ${mobileOpen ? styles.visible : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
        <div className={styles.brand}>
          <Link href="/admin" className={styles.brandLink}>
            <Image src="/k-logo.png" alt="Logo" width={36} height={36} className={styles.brandLogo} />
            <div className={styles.brandText}>
              <span className={styles.brandName}>KnightyBuilds</span>
              <span className={styles.brandLabel}>Admin Panel</span>
            </div>
          </Link>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {topNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.navDivider} />

          {navGroups.map((group) => (
            <div key={group.id} className={styles.navGroup}>
              <button
                className={`${styles.navGroupHeader} ${expandedGroups.includes(group.id) ? styles.expanded : ''}`}
                onClick={() => toggleGroup(group.id)}
              >
                {group.icon}
                <span>{group.label}</span>
                <ChevronDown size={16} className={styles.chevron} />
              </button>
              {expandedGroups.includes(group.id) && (
                <ul className={styles.navGroupItems}>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`${styles.navSubItem} ${isActive(item.href) ? styles.active : ''}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={styles.navBadge}>{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className={styles.navDivider} />

          <ul className={styles.navList}>
            {bottomNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.userSection}>
          <Link href="/" className={styles.homeLink}>
            <Home size={16} />
            Back to Site
            <ExternalLink size={12} />
          </Link>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name || 'Admin'} />
              ) : (
                getInitials(profile?.display_name || 'Admin')
              )}
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{profile?.display_name || 'Admin'}</div>
              <div className={styles.userRole}>
                <Shield size={10} style={{ display: 'inline', marginRight: 4 }} />
                Administrator
              </div>
            </div>
          </div>
          <button className={styles.signOutBtn} onClick={() => setShowSignOutModal(true)}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of the admin dashboard?"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutModal(false)}
        confirmVariant="danger"
      />
    </>
  )
}