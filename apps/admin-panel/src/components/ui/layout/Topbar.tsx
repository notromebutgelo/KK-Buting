'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'
import { cn } from '@/utils/cn'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  readAt: string | null
  createdAt: string
  link: string | null
}

interface TopbarProps {
  title?: string
  onToggleSidebar?: () => void
  onToggleCollapse?: () => void
  isSidebarCollapsed?: boolean
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function notifDotColor(type: string) {
  if (type === 'success') return 'bg-green-500'
  if (type === 'error' || type === 'warning') return 'bg-red-500'
  if (type === 'transaction') return 'bg-[color:var(--kk-primary-2)]'
  return 'bg-[color:var(--kk-primary)]'
}

export default function Topbar({
  title,
  onToggleSidebar,
  onToggleCollapse,
  isSidebarCollapsed,
}: TopbarProps) {
  const router = useRouter()
  const [adminRole, setAdminRole] = useState('admin')
  const [adminEmail, setAdminEmail] = useState('')

  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [markingRead, setMarkingRead] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    setAdminRole(window.localStorage.getItem('kk-admin-role') || 'admin')
    setAdminEmail(window.localStorage.getItem('kk-admin-email') || '')
  }, [])

  // Initial fetch on mount for the badge count
  useEffect(() => {
    api
      .get<{ notifications: Notification[] }>('/notifications/me')
      .then((res) => setNotifications(res.data.notifications || []))
      .catch(() => {})
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!notifOpen) return

    function handleOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notifOpen])

  const handleBellClick = async () => {
    if (notifOpen) {
      setNotifOpen(false)
      return
    }

    setNotifOpen(true)
    setNotifLoading(true)
    try {
      const res = await api.get<{ notifications: Notification[] }>('/notifications/me')
      setNotifications(res.data.notifications || [])
    } catch {
      // keep existing list
    } finally {
      setNotifLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    try {
      await api.post('/notifications/me/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })))
    } catch {
      // silent
    } finally {
      setMarkingRead(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    window.localStorage.removeItem('kk-admin-role')
    window.localStorage.removeItem('kk-admin-email')
    document.cookie = 'admin-token=; path=/; max-age=0'
    document.cookie = 'admin-role=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[color:var(--kk-border)] bg-white/88 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--kk-border)] text-[color:var(--kk-primary)] transition-colors hover:bg-[#eef5fd] lg:hidden"
            aria-label="Open sidebar menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden h-10 items-center justify-center rounded-xl border border-[color:var(--kk-border)] px-3 text-[color:var(--kk-primary)] transition-colors hover:bg-[#eef5fd] lg:inline-flex"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 5-7 7 7 7" />
              )}
            </svg>
          </button>
        </div>

        <div>
          <h1 className="text-lg font-bold text-[color:var(--kk-primary)]">{title || 'Admin Panel'}</h1>
          <p className="text-xs text-[color:var(--kk-muted)]">Aligned with the Youth PWA visual system</p>
        </div>
        <Image
          src="/images/FOOTER.png"
          alt="SK Barangay Buting"
          width={132}
          height={34}
          className="hidden h-auto w-[132px] object-contain lg:block"
        />
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={handleBellClick}
            className="relative text-[color:var(--kk-primary)]/55 transition-colors hover:text-[color:var(--kk-primary)]"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--kk-accent)] text-[9px] font-black text-[#014384]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[color:var(--kk-accent)]" />
            )}
          </button>

          {notifOpen ? (
            <div className="absolute right-0 top-10 z-50 w-[340px] overflow-hidden rounded-[20px] border border-[color:var(--kk-border)] bg-white shadow-[0_20px_60px_rgba(1,67,132,0.16)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[color:var(--kk-border)] px-5 py-4">
                <div>
                  <p className="text-sm font-black text-[color:var(--kk-primary)]">Notifications</p>
                  {unreadCount > 0 ? (
                    <p className="text-xs text-[color:var(--kk-muted)]">{unreadCount} unread</p>
                  ) : (
                    <p className="text-xs text-[color:var(--kk-muted)]">All caught up</p>
                  )}
                </div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    disabled={markingRead}
                    className="rounded-lg bg-[#eef5fd] px-3 py-1.5 text-xs font-semibold text-[color:var(--kk-primary)] transition-colors hover:bg-[#ddeaf8] disabled:opacity-50"
                  >
                    {markingRead ? 'Marking...' : 'Mark all read'}
                  </button>
                ) : null}
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <svg className="h-5 w-5 animate-spin text-[color:var(--kk-primary)]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
                    <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
                    <p className="text-xs text-slate-300">System events will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#f0f4f8]">
                    {notifications.map((notif) => (
                      <li
                        key={notif.id}
                        className={cn(
                          'flex gap-3 px-5 py-4 transition-colors',
                          !notif.read ? 'bg-[#f7fbff]' : 'bg-white'
                        )}
                      >
                        <div className="mt-1 flex-shrink-0">
                          <span className={cn('block h-2 w-2 rounded-full', notif.read ? 'bg-slate-200' : notifDotColor(notif.type))} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm leading-snug', notif.read ? 'font-medium text-slate-600' : 'font-bold text-slate-900')}>
                              {notif.title}
                            </p>
                            <span className="flex-shrink-0 text-[11px] text-slate-400">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{notif.body}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 ? (
                <div className="border-t border-[color:var(--kk-border)] px-5 py-3 text-center">
                  <p className="text-xs text-[color:var(--kk-muted)]">
                    Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Admin info */}
        <div className="flex items-center gap-2 border-l border-[color:var(--kk-border)] pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#014384_0%,#0572dc_100%)]">
            <span className="text-white text-xs font-bold">
              {adminRole === 'superadmin' ? 'S' : 'A'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold capitalize text-[color:var(--kk-primary)]">
              {adminRole}
            </p>
            <p className="text-xs text-[color:var(--kk-muted)]">
              {adminEmail || 'Administrator'}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-[color:var(--kk-primary)]/55 transition-colors hover:text-[color:var(--kk-primary)]"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
