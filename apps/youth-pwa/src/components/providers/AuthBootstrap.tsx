'use client'

import { useAuth } from '@/hooks/useAuth'
import { useInactivityLogout } from '@/hooks/useInactivityLogout'

export default function AuthBootstrap() {
  useAuth()
  useInactivityLogout()
  return null
}
