'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import AdminDashboardView from '@/components/dashboard/views/AdminDashboardView'
import SuperadminDashboardView from '@/components/dashboard/views/SuperadminDashboardView'
import type { DashboardStats } from '@/components/dashboard/types'

function emptyStats(): DashboardStats {
  return {
    totalUsers: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    archivedUsers: 0,
    profileSubmitted: 0,
    incompleteProfiles: 0,
    profilingCompletionRate: 0,
    verificationQueue: 0,
    pointsActivity: { today: 0, thisWeek: 0, thisMonth: 0 },
    merchantStats: { approved: 0, pending: 0, total: 0 },
    demographics: { ageGroups: [], genderSplit: [] },
    recentActivity: [],
  }
}

function normalizeDashboardStats(raw: any): DashboardStats {
  const fallback = emptyStats()
  const source = raw && typeof raw === 'object' ? raw : {}
  const demographics = source.demographics && typeof source.demographics === 'object' ? source.demographics : {}
  const pointsActivity = source.pointsActivity && typeof source.pointsActivity === 'object' ? source.pointsActivity : {}
  const merchantStats = source.merchantStats && typeof source.merchantStats === 'object' ? source.merchantStats : {}

  return {
    totalUsers: Number(source.totalUsers) || 0,
    verified: Number(source.verified) || 0,
    pending: Number(source.pending) || 0,
    rejected: Number(source.rejected) || 0,
    archivedUsers: Number(source.archivedUsers) || 0,
    profileSubmitted: Number(source.profileSubmitted) || 0,
    incompleteProfiles: Number(source.incompleteProfiles) || 0,
    profilingCompletionRate: Number(source.profilingCompletionRate) || 0,
    verificationQueue: Number(source.verificationQueue) || 0,
    pointsActivity: {
      today: Number(pointsActivity.today) || 0,
      thisWeek: Number(pointsActivity.thisWeek) || 0,
      thisMonth: Number(pointsActivity.thisMonth) || 0,
    },
    merchantStats: {
      approved: Number(merchantStats.approved) || 0,
      pending: Number(merchantStats.pending) || 0,
      total: Number(merchantStats.total) || 0,
    },
    demographics: {
      ageGroups: Array.isArray(demographics.ageGroups) ? demographics.ageGroups : fallback.demographics.ageGroups,
      genderSplit: Array.isArray(demographics.genderSplit) ? demographics.genderSplit : fallback.demographics.genderSplit,
    },
    recentActivity: Array.isArray(source.recentActivity) ? source.recentActivity : fallback.recentActivity,
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [isLoading, setIsLoading] = useState(true)
  const [role, setRole] = useState<string>('admin')

  useEffect(() => {
    setRole(window.localStorage.getItem('kk-admin-role') || 'admin')

    api
      .get('/admin/dashboard')
      .then((res) => setStats(normalizeDashboardStats(res.data?.stats || res.data)))
      .catch(() => setStats(emptyStats()))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="admin-panel overflow-hidden">
          <div className="h-28 animate-pulse rounded-3xl" style={{ background: 'var(--surface-muted)' }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="admin-panel h-40 animate-pulse"
              style={{ background: 'color-mix(in srgb, var(--card) 90%, transparent)' }}
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="admin-panel h-[360px] animate-pulse" style={{ background: 'var(--card)' }} />
          <div className="admin-panel h-[360px] animate-pulse" style={{ background: 'var(--card)' }} />
        </div>
      </div>
    )
  }

  if (role === 'superadmin') {
    return <SuperadminDashboardView stats={stats} />
  }

  return <AdminDashboardView stats={stats} />
}
