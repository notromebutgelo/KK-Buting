'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/utils/cn'

type NavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
  icon: (active: boolean) => React.ReactNode
}

interface BottomNavProps {
  onNavigate?: () => void
}

const sideItems: NavItem[] = [
  {
    href: '/home',
    label: 'Home',
    isActive: (pathname) => pathname === '/home',
    icon: (active) => (
      <svg
        className={cn('h-6 w-6')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 11.5 12 5l8 6.5V19a2 2 0 0 1-2 2h-3.5a1 1 0 0 1-1-1v-3.5h-3V20a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2v-7.5Z"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
      </svg>
    ),
  },
  {
    href: '/rewards',
    label: 'Rewards',
    isActive: (pathname) => pathname.startsWith('/rewards'),
    icon: (active) => (
      <svg
        className={cn('h-6 w-6')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12 3 2.4 4.8 5.3.8-3.9 3.8.9 5.3-4.7-2.5-4.7 2.5.9-5.3L4.3 8.6l5.3-.8L12 3Z"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
      </svg>
    ),
  },
  {
    href: '/scanner/digital-id',
    label: 'Digital ID',
    isActive: (pathname) => pathname.startsWith('/scanner/digital-id'),
    icon: (active) => (
      <svg
        className={cn('h-6 w-6')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2.5"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
        <circle
          cx="8"
          cy="12"
          r="2.2"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
        <path
          strokeLinecap="round"
          d="M12.5 10h4M12.5 13h4M6 16.2h6.5"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    isActive: (pathname) => pathname.startsWith('/profile'),
    icon: (active) => (
      <svg
        className={cn('h-6 w-6')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0"
          className={active ? 'text-[#FCB315]' : 'text-white'}
        />
      </svg>
    ),
  },
]

export default function BottomNav({ onNavigate }: BottomNavProps) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const leftItems = sideItems.slice(0, 2)
  const rightItems = sideItems.slice(2)
  const isScannerActive = pathname === '/scanner'

  useEffect(() => {
    lastScrollYRef.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollingDown = currentScrollY > lastScrollYRef.current
      const hasMovedEnough = Math.abs(currentScrollY - lastScrollYRef.current) > 8

      if (!hasMovedEnough) return

      if (currentScrollY < 24) {
        setIsVisible(true)
      } else {
        setIsVisible(!scrollingDown)
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 pb-[max(0px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out',
        isVisible ? 'translate-y-0' : 'translate-y-[120%]'
      )}
    >
      <div className="relative flex items-end justify-between bg-[#014384] px-5 pb-5 pt-4 shadow-[0_-10px_30px_rgba(1,67,132,0.22)]">
        <div className="flex flex-1 items-end justify-around pr-10">
          {leftItems.map((item) => {
            const active = item.isActive(pathname)
            return (
              <NavLink key={item.href} item={item} active={active} onNavigate={onNavigate} />
            )
          })}
        </div>

        <Link
          href="/scanner"
          onClick={() => {
            if (!isScannerActive) {
              onNavigate?.()
            }
          }}
          className="absolute left-1/2 top-0 flex h-[74px] w-[74px] -translate-x-1/2 -translate-y-[34px] items-center justify-center rounded-full border-[8px] border-white bg-[#014384] shadow-[0_10px_24px_rgba(1,67,132,0.25)]"
          aria-label="Open my QR code"
        >
          <QrIcon active={isScannerActive} />
        </Link>

        <div className="flex flex-1 items-end justify-around pl-10">
          {rightItems.map((item) => {
            const active = item.isActive(pathname)
            return (
              <NavLink key={item.href} item={item} active={active} onNavigate={onNavigate} />
            )
          })}
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={() => {
        if (!active) {
          onNavigate?.()
        }
      }}
      className="flex min-w-[64px] flex-col items-center justify-end gap-1.5"
    >
      {item.icon(active)}
      <span
        className={cn(
          'text-[12px] font-medium leading-none',
          active ? 'text-[#FCB315]' : 'text-white'
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

function QrIcon({ active }: { active: boolean }) {
  const color = active ? '#FCB315' : '#FFFFFF'

  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" stroke={color} strokeWidth="2" />
      <rect x="15" y="3" width="6" height="6" stroke={color} strokeWidth="2" />
      <rect x="3" y="15" width="6" height="6" stroke={color} strokeWidth="2" />
      <path d="M15 15h2v2h-2zM19 15h2v6h-2zM15 19h4v2h-4z" fill={color} />
      <path d="M5 5h2v2H5zM17 5h2v2h-2zM5 17h2v2H5z" fill={color} />
    </svg>
  )
}
