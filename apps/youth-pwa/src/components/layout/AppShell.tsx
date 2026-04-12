'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import PageScreenSpinner from '@/components/ui/PageScreenSpinner'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  useAuth()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const mainBackgroundClass = getMainBackgroundClass(pathname)

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent">
      {isNavigating ? <PageScreenSpinner label="Loading your next page..." /> : null}
      <main className={`flex-1 pb-[calc(7rem+var(--safe-area-inset-bottom))] ${mainBackgroundClass}`}>
        {children}
      </main>
      <BottomNav onNavigate={() => setIsNavigating(true)} />
    </div>
  )
}

function getMainBackgroundClass(pathname: string) {
  if (pathname.startsWith('/rewards')) {
    return 'bg-[#0a5ca8]'
  }

  if (pathname.startsWith('/merchants')) {
    return 'bg-[#edf3fb]'
  }

  if (pathname.startsWith('/profile')) {
    return 'bg-gray-50'
  }

  if (pathname.startsWith('/scanner')) {
    return 'bg-[#f6f8fc]'
  }

  return 'bg-[#f4f4f4]'
}
