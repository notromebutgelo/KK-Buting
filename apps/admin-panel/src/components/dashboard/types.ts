export interface DashboardStats {
  totalUsers: number
  verified: number
  pending: number
  rejected: number
  archivedUsers: number
  profileSubmitted: number
  incompleteProfiles: number
  profilingCompletionRate: number
  verificationQueue: number
  pointsActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  merchantStats: {
    approved: number
    pending: number
    total: number
  }
  demographics: {
    ageGroups: Array<{ name: string; value: number }>
    genderSplit: Array<{ name: string; value: number }>
  }
  recentActivity: Array<{
    id: string
    type: 'registration' | 'verification' | 'transaction' | 'document' | string
    title: string
    description: string
    timestamp: string
    status?: string
  }>
}

export type DashboardActivity = DashboardStats['recentActivity'][number]
