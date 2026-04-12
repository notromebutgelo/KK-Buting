'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import LoadingModal from '@/components/ui/LoadingModal'
import Sidebar from '@/components/ui/layout/Sidebar'
import Topbar from '@/components/ui/layout/Topbar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navigationLabel, setNavigationLabel] = useState('Loading page')

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')

    const syncSidebarState = (event?: MediaQueryList | MediaQueryListEvent) => {
      const matches = 'matches' in (event || media) ? (event || media).matches : media.matches
      setIsSidebarOpen(matches)
    }

    syncSidebarState(media)

    const handler = (event: MediaQueryListEvent) => syncSidebarState(event)
    media.addEventListener('change', handler)

    return () => {
      media.removeEventListener('change', handler)
    }
  }, [])

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <LoadingModal
        open={isNavigating}
        title={navigationLabel}
        description="Loading the next admin page and preparing the latest dashboard data."
      />
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={(label) => {
          setNavigationLabel(`Opening ${label}`)
          setIsNavigating(true)
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
          isSidebarCollapsed={isSidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
