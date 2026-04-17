'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'

const allNavItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    superadminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/verification',
    label: 'Verification',
    superadminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/youth',
    label: 'Youth Members',
    superadminOnly: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/merchants',
    label: 'Merchants',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/points-transactions',
    label: 'Points & Txns',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-2.761 0-5 .895-5 2s2.239 2 5 2 5-.895 5-2-2.239-2-5-2zm0 0V5m0 7v7m-7-5c0 1.105 3.134 2 7 2s7-.895 7-2m-14 4c0 1.105 3.134 2 7 2s7-.895 7-2" />
      </svg>
    ),
  },
  {
    href: '/reports',
    label: 'Reports',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: '/digital-ids',
    label: 'Digital IDs',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
      </svg>
    ),
  },
  {
    href: '/vouchers',
    label: 'Vouchers',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    href: '/promotions',
    label: 'Promotions',
    superadminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onNavigate?: (label: string) => void
}

export default function Sidebar({ isOpen, isCollapsed, onClose, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const [role, setRole] = useState<string>('admin')

  useEffect(() => {
    setRole(window.localStorage.getItem('kk-admin-role') || 'admin')
  }, [])

  const navItems = role === 'superadmin'
    ? allNavItems
    : allNavItems.filter((item) => !item.superadminOnly)

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar overlay"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-[#014384]/38 backdrop-blur-[2px] transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex min-h-screen flex-col border-r border-[color:var(--kk-border)] bg-[linear-gradient(180deg,#014384_0%,#035db7_52%,#0572dc_100%)] text-white shadow-[0_20px_50px_rgba(1,67,132,0.28)] transition-all duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-[92px]' : 'w-64'
        )}
      >
      {/* Logo */}
      <div className={cn('border-b border-white/12 py-5', isCollapsed ? 'px-4' : 'px-6')}>
        <div className={cn('flex items-start gap-3', isCollapsed && 'justify-center')}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 p-1 shadow-[0_10px_24px_rgba(0,0,0,0.12)] ring-2 ring-white/20">
            <Image
              src="/images/SKButingLogo.png"
              alt="SK Buting logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          </div>
          {!isCollapsed ? (
            <div>
              <p className="text-sm font-black uppercase leading-tight tracking-[0.04em] text-white">KK Admin</p>
              <p className="mt-1 text-xs text-blue-100/85">Barangay Buting Management System</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-4 scrollbar-thin', isCollapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!pathname.startsWith(item.href)) {
                  onNavigate?.(item.label)
                }
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  onClose()
                }
              }}
              className={cn(
                'flex rounded-xl py-2.5 text-sm font-medium transition-colors',
                isCollapsed ? 'justify-center px-2.5' : 'items-center gap-3 px-3',
                isActive
                  ? 'bg-[linear-gradient(90deg,#fcb315_0%,#fcba2c_100%)] text-[#014384] shadow-[0_12px_24px_rgba(252,179,21,0.24)]'
                  : 'text-blue-100/78 hover:bg-white/10 hover:text-white'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed ? item.label : null}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-white/12 py-4', isCollapsed ? 'px-3' : 'px-6')}>
        {!isCollapsed ? (
          <Image
            src="/images/FOOTER.png"
            alt="Sangguniang Kabataan Barangay Buting"
            width={170}
            height={44}
            className="h-auto w-[170px] object-contain"
          />
        ) : (
          <div className="flex justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FCB315]" />
          </div>
        )}
        {!isCollapsed ? (
          <p className="mt-3 text-xs text-blue-100/70">KK System v1.0</p>
        ) : null}
      </div>
      </aside>
    </>
  )
}
