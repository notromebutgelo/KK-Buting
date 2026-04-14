'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface DashboardStats {
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

const PIE_COLORS = ['#014384', '#0572DC', '#FCB315', '#FCBA2C', '#8AAED6']

function SummaryCard({
  label,
  value,
  sublabel,
  tone,
  icon,
}: {
  label: string
  value: number | string
  sublabel: string
  tone: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-white/65 bg-white/90 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{sublabel}</p>
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg',
            tone
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function QuickAction({
  href,
  title,
  description,
  tone,
  badge,
  icon,
}: {
  href: string
  title: string
  description: string
  tone: string
  badge?: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl text-white', tone)}>
          {icon}
        </div>
        {badge ? (
          <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-extrabold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setStats(res.data.stats || res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  const s: DashboardStats = stats || {
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

  const queueUrgent = s.verificationQueue > 0

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#014384_0%,#035DB7_50%,#0572DC_100%)] px-7 py-7 text-white shadow-[0_24px_70px_rgba(1,67,132,0.24)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(252,186,44,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#fff3cf]">
              Dashboard Overview
              {queueUrgent ? (
                <span className="rounded-full bg-[color:var(--kk-accent)] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#014384]">
                  {s.verificationQueue} pending
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
              Real-time pulse of registrations, verification, merchants, and points activity.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#edf4fb]">
              Keep approval bottlenecks visible, monitor profiling completion, and jump straight
              into the next action that moves the system forward.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#fff3cf]">Completion</p>
              <p className="mt-1 text-2xl font-black">{s.profilingCompletionRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#fff3cf]">Approved Merchants</p>
              <p className="mt-1 text-2xl font-black">{s.merchantStats.approved}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#fff3cf]">Points Today</p>
              <p className="mt-1 text-2xl font-black">{s.pointsActivity.today.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Registered Youth"
          value={s.totalUsers}
          sublabel="Total youth accounts in the system"
          tone="bg-[linear-gradient(135deg,#014384,#0572DC)]"
          icon={<UsersIcon />}
        />
        <SummaryCard
          label="Verified"
          value={s.verified}
          sublabel="Profiles cleared for digital ID access"
          tone="bg-[linear-gradient(135deg,#035DB7,#0572DC)]"
          icon={<CheckIcon />}
        />
        <SummaryCard
          label="Pending"
          value={s.pending}
          sublabel="Profiles waiting on admin review"
          tone="bg-[linear-gradient(135deg,#FCB315,#FCBA2C)]"
          icon={<ClockIcon />}
        />
        <SummaryCard
          label="Rejected"
          value={s.rejected}
          sublabel="Profiles that need resubmission"
          tone="bg-[linear-gradient(135deg,#dc2626,#fb7185)]"
          icon={<CloseIcon />}
        />
        <SummaryCard
          label="Archived (31+)"
          value={s.archivedUsers}
          sublabel="Aged-out members needing archival review"
          tone="bg-[linear-gradient(135deg,#4d78ac,#8AAED6)]"
          icon={<ArchiveIcon />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Profiling Completion
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                    {s.profilingCompletionRate}% complete
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {s.profileSubmitted.toLocaleString()} completed profiles versus{' '}
                    {s.incompleteProfiles.toLocaleString()} incomplete registrations.
                  </p>
                </div>
                <div className="rounded-2xl bg-[#eef5fd] px-3 py-2 text-right">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--kk-primary)]">
                    Done
                  </p>
                  <p className="text-2xl font-black text-[color:var(--kk-primary)]">{s.profileSubmitted}</p>
                </div>
              </div>

              <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#014384_0%,#0572DC_55%,#FCBA2C_100%)]"
                  style={{ width: `${Math.max(s.profilingCompletionRate, 6)}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricTile label="Completed" value={s.profileSubmitted} tone="text-[color:var(--kk-primary)]" />
                <MetricTile label="Incomplete" value={s.incompleteProfiles} tone="text-[color:var(--kk-muted)]" />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      Verification Queue
                    </p>
                    {queueUrgent ? (
                      <span className="rounded-full bg-[color:var(--kk-accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#014384]">
                        Attention
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#eef5fd] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--kk-primary)]">
                        Clear
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                    {s.verificationQueue.toLocaleString()} pending review
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Pending document checks should stay visible here so admins can resolve them fast.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3cf] text-[color:var(--kk-primary)]">
                  <QueueIcon />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <StatusLine
                  label="Pending documents"
                  value={s.verificationQueue}
                  barClassName="bg-[color:var(--kk-accent)]"
                  width={queueUrgent ? 100 : 12}
                />
                <StatusLine
                  label="Verified members"
                  value={s.verified}
                  barClassName="bg-[color:var(--kk-primary-2)]"
                  width={s.totalUsers ? (s.verified / s.totalUsers) * 100 : 0}
                />
                <StatusLine
                  label="Rejected profiles"
                  value={s.rejected}
                  barClassName="bg-[#c85b5b]"
                  width={s.totalUsers ? (s.rejected / s.totalUsers) * 100 : 0}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Points Activity
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                    Awarded points summary
                  </h2>
                </div>
                <div className="rounded-2xl bg-[#eef5fd] px-3 py-2 text-[color:var(--kk-primary)]">
                  <SparkIcon />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MetricTile label="Today" value={s.pointsActivity.today} tone="text-[color:var(--kk-primary)]" />
                <MetricTile label="This week" value={s.pointsActivity.thisWeek} tone="text-[color:var(--kk-primary-2)]" />
                <MetricTile label="This month" value={s.pointsActivity.thisMonth} tone="text-[#d18b00]" />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Merchants
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                    Partner status overview
                  </h2>
                </div>
                <div className="rounded-2xl bg-[#fff3cf] px-3 py-2 text-[#9b6500]">
                  <StoreIcon />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <MetricTile label="Approved" value={s.merchantStats.approved} tone="text-[color:var(--kk-primary)]" />
                <MetricTile label="Pending" value={s.merchantStats.pending} tone="text-[#d18b00]" />
                <MetricTile label="Total" value={s.merchantStats.total} tone="text-[color:var(--kk-muted)]" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Quick Actions
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                  Jump straight into admin work
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <QuickAction
                href="/verification"
                title="Review pending docs"
                description="Open the verification queue and process pending document submissions."
                tone="bg-[linear-gradient(135deg,#FCB315,#FCBA2C)]"
                badge={s.verificationQueue > 0 ? String(s.verificationQueue) : undefined}
                icon={<QueueIcon />}
              />
              <QuickAction
                href="/merchants"
                title="Approve pending merchants"
                description="Check partner applications and publish approved merchants to youth-facing screens."
                tone="bg-[linear-gradient(135deg,#014384,#0572DC)]"
                badge={s.merchantStats.pending > 0 ? String(s.merchantStats.pending) : undefined}
                icon={<StoreIcon />}
              />
              <QuickAction
                href="/reports"
                title="Generate reports"
                description="Open charts and summary views for demographic and verification reporting."
                tone="bg-[linear-gradient(135deg,#035DB7,#0572DC)]"
                icon={<ChartIcon />}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Demographics
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                  Youth snapshot
                </h2>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-800">Age group breakdown</h3>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.demographics.ageGroups} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d9e6f3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#6a7f98' }}
                      interval={0}
                      angle={-10}
                      textAnchor="end"
                      height={55}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#6a7f98' }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0572DC" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-bold text-slate-800">Gender split</h3>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={s.demographics.genderSplit}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {s.demographics.genderSplit.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {s.demographics.genderSplit.map((entry, index) => (
                  <span
                    key={entry.name}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    {entry.name}: {entry.value}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Recent Activity
                </p>
                <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-900">
                  Latest 10 events
                </h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {s.recentActivity.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                  No recent activity yet.
                </div>
              ) : (
                s.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                  >
                    <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white', activityTone(activity.type, activity.status))}>
                      {activityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{activity.title}</p>
                        <span className="text-[11px] font-medium text-slate-400">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={cn('mt-2 text-2xl font-black tracking-[-0.03em]', tone)}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function StatusLine({
  label,
  value,
  width,
  barClassName,
}: {
  label: string
  value: number
  width: number
  barClassName: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value.toLocaleString()}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full', barClassName)}
          style={{ width: `${Math.min(Math.max(width, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

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

function activityTone(type: string, status?: string) {
  if (type === 'verification' && status === 'verified') return 'bg-[color:var(--kk-primary-2)]'
  if (type === 'verification' && status === 'rejected') return 'bg-rose-500'
  if (type === 'transaction') return 'bg-[color:var(--kk-primary)]'
  if (type === 'document') return 'bg-[color:var(--kk-accent)] text-[#014384]'
  return 'bg-[color:var(--kk-primary)]'
}

function activityIcon(type: string) {
  if (type === 'verification') return <CheckIcon />
  if (type === 'transaction') return <SparkIcon />
  if (type === 'document') return <QueueIcon />
  return <UsersIcon />
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M6 7l1 12h10l1-12M9 11h6" />
    </svg>
  )
}

function QueueIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.5 4.5 5h15L21 9.5M5 10v8.5A1.5 1.5 0 0 0 6.5 20H17.5A1.5 1.5 0 0 0 19 18.5V10M9 20v-5h6v5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20V10m5 10V4m5 16v-7" />
    </svg>
  )
}
