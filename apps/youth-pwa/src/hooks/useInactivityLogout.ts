'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut as signOutFromFirebase } from '@/services/auth.service'
import { clearYouthSession } from '@/lib/session'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'

const YOUTH_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const YOUTH_INACTIVITY_DEADLINE_KEY = 'kk-youth-inactivity-deadline'

type InactivityRecord = {
  uid: string
  deadline: number
}

export function useInactivityLogout() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isAuthLoading = useAuthStore((state) => state.isLoading)
  const logout = useAuthStore((state) => state.logout)
  const setProfile = useUserStore((state) => state.setProfile)
  const timeoutRef = useRef<number | null>(null)
  const isLoggingOutRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const performLogout = useCallback(async () => {
    if (isLoggingOutRef.current) {
      return
    }

    isLoggingOutRef.current = true
    clearTimer()

    try {
      await signOutFromFirebase()
    } catch {
      // Firebase can already be signed out in another tab.
    } finally {
      await clearYouthSession()
      window.localStorage.removeItem(YOUTH_INACTIVITY_DEADLINE_KEY)
      setProfile(null)
      logout()
      router.replace('/login')
    }
  }, [clearTimer, logout, router, setProfile])

  const scheduleDeadline = useCallback(
    (deadline: number) => {
      clearTimer()

      const delay = Math.max(0, deadline - Date.now())
      timeoutRef.current = window.setTimeout(() => {
        void performLogout()
      }, delay)
    },
    [clearTimer, performLogout]
  )

  useEffect(() => {
    if (!user) {
      clearTimer()

      if (!isAuthLoading) {
        window.localStorage.removeItem(YOUTH_INACTIVITY_DEADLINE_KEY)
        isLoggingOutRef.current = false
      }

      return
    }

    const readRecord = () => readInactivityRecord()
    const writeFreshDeadline = () => {
      const nextRecord = {
        uid: user.uid,
        deadline: Date.now() + YOUTH_INACTIVITY_TIMEOUT_MS,
      }

      window.localStorage.setItem(
        YOUTH_INACTIVITY_DEADLINE_KEY,
        JSON.stringify(nextRecord)
      )
      scheduleDeadline(nextRecord.deadline)
    }

    const existingRecord = readRecord()
    if (existingRecord?.uid === user.uid && existingRecord.deadline <= Date.now()) {
      void performLogout()
      return
    }

    if (existingRecord?.uid === user.uid) {
      scheduleDeadline(existingRecord.deadline)
    } else {
      writeFreshDeadline()
    }

    const handleActivity = () => {
      writeFreshDeadline()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      const record = readRecord()
      if (record?.uid === user.uid && record.deadline <= Date.now()) {
        void performLogout()
        return
      }

      writeFreshDeadline()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== YOUTH_INACTIVITY_DEADLINE_KEY) {
        return
      }

      const record = readRecord()
      if (!record || record.uid !== user.uid) {
        return
      }

      if (record.deadline <= Date.now()) {
        void performLogout()
        return
      }

      scheduleDeadline(record.deadline)
    }

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener('storage', handleStorage)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimer()
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity)
      })
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [clearTimer, isAuthLoading, performLogout, scheduleDeadline, user])
}

function readInactivityRecord(): InactivityRecord | null {
  const rawValue = window.localStorage.getItem(YOUTH_INACTIVITY_DEADLINE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<InactivityRecord>
    const uid = String(parsedValue.uid || '').trim()
    const deadline = Number(parsedValue.deadline)

    if (!uid || !Number.isFinite(deadline)) {
      return null
    }

    return { uid, deadline }
  } catch {
    return null
  }
}
