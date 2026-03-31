'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { hasCompletedProfiling } from '@/services/profiling.service'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)

  useEffect(() => {
    let active = true

    async function guardProfiling() {
      try {
        const completed = await hasCompletedProfiling()
        if (!completed) {
          router.replace('/intro')
          return
        }
      } catch {
        router.replace('/intro')
        return
      } finally {
        if (active) {
          setIsCheckingProfile(false)
        }
      }
    }

    guardProfiling()

    return () => {
      active = false
    }
  }, [router])

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#014384]/20 border-t-[#014384] animate-spin" />
      </div>
    )
  }

  return <AppShell>{children}</AppShell>
}
