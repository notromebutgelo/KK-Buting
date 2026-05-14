import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ChartNoAxesColumn,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  DashboardChartCard,
  DashboardEmptyState,
  DashboardPanel,
  DashboardPill,
} from '@/components/dashboard/primitives'
import {
  DashboardLegendGrid,
  DemographicBarChart,
  DonutBreakdownChart,
  SnapshotBarChart,
  VerificationLifecycleChart,
} from '@/components/dashboard/charts'
import type { DashboardActivity, DashboardStats } from '@/components/dashboard/types'

type MetricTone = 'blue' | 'green' | 'yellow' | 'red'
type ActivityPillTone = 'default' | 'soft' | 'success' | 'warning' | 'danger'

function buildPointsData(stats: DashboardStats) {
  return [
    { label: 'Today', value: stats.pointsActivity.today, color: '#0f4c97' },
    { label: 'This week', value: stats.pointsActivity.thisWeek, color: '#2f7ef7' },
    { label: 'This month', value: stats.pointsActivity.thisMonth, color: '#22a06b' },
  ]
}

function topAgeGroup(stats: DashboardStats) {
  const top = [...stats.demographics.ageGroups].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} remains the largest segment across the registry.` : 'No age group data yet.'
}

function topGender(stats: DashboardStats) {
  const top = [...stats.demographics.genderSplit].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} currently has the highest recorded count.` : 'No gender split data yet.'
}

function activityMeta(activity: DashboardActivity) {
  if (activity.type === 'verification') {
    const pillTone: ActivityPillTone =
      activity.status === 'rejected' ? 'danger' : activity.status === 'verified' ? 'success' : 'warning'

    return {
      icon: ShieldCheck,
      iconBg: activity.status === 'rejected' ? '#fff0f3' : activity.status === 'verified' ? '#e9f8ef' : '#fff8e7',
      iconColor: activity.status === 'rejected' ? '#d14357' : activity.status === 'verified' ? '#198754' : '#b88a14',
      pillTone,
      pillLabel: prettifyLabel(activity.status || 'review'),
    }
  }

  if (activity.type === 'transaction') {
    return {
      icon: ChartNoAxesColumn,
      iconBg: '#edf4ff',
      iconColor: '#0f4c97',
      pillTone: 'soft' as const,
      pillLabel: 'Transaction',
    }
  }

  if (activity.type === 'document') {
    return {
      icon: FileText,
      iconBg: '#edf4ff',
      iconColor: '#0f4c97',
      pillTone: 'soft' as const,
      pillLabel: 'Document',
    }
  }

  return {
    icon: Users,
    iconBg: '#edf4ff',
    iconColor: '#0f4c97',
    pillTone: 'default' as const,
    pillLabel: prettifyLabel(activity.type || 'activity'),
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function prettifyLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function SuperadminDashboardView({ stats }: { stats: DashboardStats }) {
  const pointsData = buildPointsData(stats)
  const merchantData = [
    { label: 'Approved', value: stats.merchantStats.approved, color: '#0f4c97' },
    { label: 'Pending', value: stats.merchantStats.pending, color: '#d9ae2a' },
    { label: 'Total', value: stats.merchantStats.total, color: 'rgba(15, 76, 151, 0.28)' },
  ]
  const strongestPointsPeriod = [...pointsData].sort((a, b) => b.value - a.value)[0]
  const approvalRate = stats.merchantStats.total
    ? Math.round((stats.merchantStats.approved / stats.merchantStats.total) * 100)
    : 0
  const recentItems = stats.recentActivity.slice(0, 6)

  const attentionItems = [
    {
      title: 'Pending Verifications',
      description: 'Approvals waiting for review',
      count: stats.verificationQueue,
      href: '/verification',
      icon: Clock3,
      tone: 'yellow' as const,
    },
    {
      title: 'Pending Merchants',
      description: 'New partners awaiting activation',
      count: stats.merchantStats.pending,
      href: '/merchants',
      icon: Store,
      tone: 'yellow' as const,
    },
    {
      title: 'Rejected Profiles',
      description: 'Require attention or follow-up',
      count: stats.rejected,
      href: '/verification',
      icon: CircleAlert,
      tone: 'red' as const,
    },
    {
      title: 'Archived Members',
      description: 'Members who have aged out',
      count: stats.archivedUsers,
      href: '/youth',
      icon: Users,
      tone: 'green' as const,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-[2rem] font-black tracking-[-0.03em]" style={{ color: 'var(--ink)' }}>
          Dashboard
        </h1>
        <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
          System pulse and daily highlights.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          label="Total Members"
          value={stats.totalUsers.toLocaleString()}
          description="All registered members"
          icon={<Users size={22} />}
          tone="blue"
        />
        <ExecutiveMetricCard
          label="Approved Merchants"
          value={stats.merchantStats.approved.toLocaleString()}
          description="Active partner base"
          icon={<Store size={22} />}
          tone="green"
        />
        <ExecutiveMetricCard
          label="Points This Week"
          value={stats.pointsActivity.thisWeek.toLocaleString()}
          description="Awarded via activity"
          icon={<TrendingUp size={22} />}
          tone="yellow"
        />
        <ExecutiveMetricCard
          label="Verification Queue"
          value={stats.verificationQueue.toLocaleString()}
          description="Pending approvals"
          icon={<ShieldCheck size={22} />}
          tone="red"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.92fr)]">
        <DashboardChartCard
          title="Member Lifecycle Overview"
          description="Quick overview of member status across the system."
          insight={`${stats.verified.toLocaleString()} verified members are already flowing through the system, while ${stats.incompleteProfiles.toLocaleString()} are still stuck before completion.`}
        >
          <VerificationLifecycleChart stats={stats} />
        </DashboardChartCard>

        <DashboardPanel className="h-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Attention Stack
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Key signals that need your priority today.
              </p>
            </div>
            <DashboardPill tone="soft">Leadership</DashboardPill>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {attentionItems.map((item) => (
              <AttentionStackCard key={item.title} {...item} />
            ))}
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1.08fr]">
        <DashboardChartCard
          title="Points Activity"
          description="This month snapshot"
          action={<DashboardPill tone="default">This Month</DashboardPill>}
          insight={`${strongestPointsPeriod.label} currently leads with ${strongestPointsPeriod.value.toLocaleString()} awarded points.`}
        >
          <SnapshotBarChart data={pointsData} height={256} />
          <DashboardLegendGrid
            items={pointsData.map((entry) => ({
              label: entry.label,
              value: entry.value.toLocaleString(),
              color: entry.color,
            }))}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Merchant Status"
          description="Approved, pending, and total records in one clean view."
          insight={`${approvalRate}% of all merchant records are approved right now.`}
        >
          <SnapshotBarChart data={merchantData} height={256} />
          <DashboardLegendGrid
            items={merchantData.map((entry) => ({
              label: entry.label,
              value: entry.value.toLocaleString(),
              color: entry.color,
            }))}
          />
        </DashboardChartCard>

        <DashboardPanel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Recent System Activity
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Latest platform activity across members, reviews, and transactions.
              </p>
            </div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--surface-muted)]"
              style={{ borderColor: 'var(--stroke)', color: 'var(--accent-strong)' }}
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-5">
            {recentItems.length === 0 ? (
              <DashboardEmptyState
                title="No recent activity yet"
                description="Once members and merchants start moving through the platform, updates will appear here."
              />
            ) : (
              <div className="divide-y divide-[color:var(--stroke)]">
                {recentItems.map((activity) => (
                  <RecentActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardChartCard
          title="Age Group Distribution"
          description="A demographic context card that supports quick strategic decisions."
          insight={topAgeGroup(stats)}
        >
          <DemographicBarChart data={stats.demographics.ageGroups} />
          <DashboardLegendGrid
            items={stats.demographics.ageGroups.map((entry) => ({
              label: entry.name,
              value: entry.value.toLocaleString(),
              color: '#0f4c97',
            }))}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Gender Split"
          description="A supporting demographic chart for the current registry mix."
          insight={topGender(stats)}
        >
          <DonutBreakdownChart data={stats.demographics.genderSplit} />
          <DashboardLegendGrid
            items={stats.demographics.genderSplit.map((entry, index) => ({
              label: entry.name,
              value: entry.value.toLocaleString(),
              color: [
                '#0f4c97',
                '#2f7ef7',
                '#d9ae2a',
                '#22a06b',
                'rgba(15, 76, 151, 0.42)',
                'rgba(47, 126, 247, 0.34)',
              ][index % 6],
            }))}
          />
        </DashboardChartCard>
      </section>
    </div>
  )
}

function ExecutiveMetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: string
  description: string
  icon: ReactNode
  tone: MetricTone
}) {
  const palette = getMetricPalette(tone)

  return (
    <div
      className="min-h-[116px] rounded-[20px] border px-5 py-5 shadow-[var(--shadow-sm)]"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
          style={{ background: palette.background, color: palette.color }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            {label}
          </p>
          <p className="mt-3 text-[2rem] font-black leading-none tracking-[-0.03em]" style={{ color: palette.color }}>
            {value}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function AttentionStackCard({
  title,
  description,
  count,
  href,
  icon: Icon,
  tone,
}: {
  title: string
  description: string
  count: number
  href: string
  icon: LucideIcon
  tone: MetricTone
}) {
  const palette = getMetricPalette(tone)

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[20px] border px-4 py-4 transition hover:bg-[color:var(--surface-muted)]/45"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
        style={{ background: palette.background, color: palette.color }}
      >
        <Icon size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[2rem] font-black leading-none tracking-[-0.03em]" style={{ color: palette.color }}>
          {count.toLocaleString()}
        </span>
        <ChevronRight
          size={18}
          className="transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--muted)' }}
        />
      </div>
    </Link>
  )
}

function RecentActivityRow({ activity }: { activity: DashboardActivity }) {
  const meta = activityMeta(activity)
  const Icon = meta.icon

  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
        style={{ background: meta.iconBg, color: meta.iconColor }}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold leading-6" style={{ color: 'var(--ink)' }}>
            {activity.title}
          </p>
          <DashboardPill tone={meta.pillTone}>{meta.pillLabel}</DashboardPill>
        </div>
        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {activity.description}
        </p>
      </div>

      <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--muted)' }}>
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  )
}

function getMetricPalette(tone: MetricTone) {
  if (tone === 'green') {
    return {
      background: '#e9f8ef',
      color: '#198754',
    }
  }

  if (tone === 'yellow') {
    return {
      background: '#fff8e7',
      color: '#b88a14',
    }
  }

  if (tone === 'red') {
    return {
      background: '#fff0f3',
      color: '#d14357',
    }
  }

  return {
    background: '#edf4ff',
    color: '#0f4c97',
  }
}
