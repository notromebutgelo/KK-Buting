'use client'

import { useAuth } from '@/hooks/useAuth'

export default function AuthBootstrap() {
  useAuth()
  return null
}
