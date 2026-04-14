'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import Image from 'next/image'
import { auth } from '@/lib/firebase'

interface TopbarProps {
  title?: string
  onToggleSidebar?: () => void
  onToggleCollapse?: () => void
  isSidebarCollapsed?: boolean
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

  useEffect(() => {
    setAdminRole(window.localStorage.getItem('kk-admin-role') || 'admin')
    setAdminEmail(window.localStorage.getItem('kk-admin-email') || '')
  }, [])

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
        {/* Notifications */}
        <button className="relative text-[color:var(--kk-primary)]/55 transition-colors hover:text-[color:var(--kk-primary)]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[color:var(--kk-accent)]" />
        </button>

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
