import { BarChart3, Clock, FileText, Store, TrendingUp, Users } from 'lucide-react'
import { DashboardActivityFeed } from '@/components/dashboard/activity-feed'
import {
  DashboardActionCard,
  DashboardChartCard,
  DashboardKpiCard,
  DashboardMiniStat,
  DashboardPageIntro,
  DashboardPanel,
  DashboardPill,
  DashboardStatusList,
} from '@/components/dashboard/primitives'
import {
  DashboardLegendGrid,
  DemographicBarChart,
  DonutBreakdownChart,
  SnapshotBarChart,
  VerificationLifecycleChart,
} from '@/components/dashboard/charts'
import type { DashboardStats } from '@/components/dashboard/types'

function topAgeGroup(stats: DashboardStats) {
  const top = [...stats.demographics.ageGroups].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} remains the largest segment across the registry.` : 'No age group data yet.'
}

function topGender(stats: DashboardStats) {
  const top = [...stats.demographics.genderSplit].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} currently has the highest recorded count.` : 'No gender split data yet.'
}

export default function SuperadminDashboardView({ stats }: { stats: DashboardStats }) {
  const pointsData = [
    { label: 'Today', value: stats.pointsActivity.today, color: 'var(--accent)' },
    { label: 'This week', value: stats.pointsActivity.thisWeek, color: 'var(--accent-strong)' },
    { label: 'This month', value: stats.pointsActivity.thisMonth, color: 'var(--accent-warm)' },
  ]
  const merchantData = [
    { label: 'Approved', value: stats.merchantStats.approved, color: 'var(--accent)' },
    { label: 'Pending', value: stats.merchantStats.pending, color: 'var(--accent-warm)' },
    { label: 'Total', value: stats.merchantStats.total, color: 'rgba(1, 67, 132, 0.34)' },
  ]

  const topPointsPeriod = [...pointsData].sort((a, b) => b.value - a.value)[0]
  const approvalRate = stats.merchantStats.total
    ? Math.round((stats.merchantStats.approved / stats.merchantStats.total) * 100)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageIntro
        eyebrow="Superadmin control center"
        title="See the platform as a system: approvals, member flow, merchants, and points health."
        description="This version stays broader than the admin dashboard. It should feel like a control tower: fewer panels than a report page, but enough breadth to decide where leadership attention goes next."
        pills={[
          <DashboardPill key="scope" tone="soft">
            Platform wide
          </DashboardPill>,
          <DashboardPill key="reviews" tone={stats.verificationQueue > 0 ? 'warning' : 'default'}>
            {stats.verificationQueue > 0 ? 'Review pressure visible' : 'Review queue calm'}
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <DashboardMiniStat
              label="Approved merchants"
              value={stats.merchantStats.approved.toLocaleString()}
              meta="Active partner base"
              tone="soft"
            />
            <DashboardMiniStat
              label="Points this week"
              value={stats.pointsActivity.thisWeek.toLocaleString()}
              meta="Awarded through merchant activity"
              tone="neutral"
            />
            <DashboardMiniStat
              label="Verification queue"
              value={stats.verificationQueue.toLocaleString()}
              meta="Current approval load"
              tone={stats.verificationQueue > 0 ? 'warning' : 'neutral'}
            />
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          title="Total Members"
          value={stats.totalUsers.toLocaleString()}
          meta="The full youth registry across every lifecycle stage."
          icon={<Users size={18} />}
          featured
        />
        <DashboardKpiCard
          title="Approved Merchants"
          value={stats.merchantStats.approved.toLocaleString()}
          meta={`${approvalRate}% of all merchant records are approved and active.`}
          icon={<Store size={18} />}
          tone="success"
        />
        <DashboardKpiCard
          title="Points This Week"
          value={stats.pointsActivity.thisWeek.toLocaleString()}
          meta="A fast proxy for real-world merchant engagement and redemptions ahead."
          icon={<TrendingUp size={18} />}
          tone="info"
          badge="ops signal"
        />
        <DashboardKpiCard
          title="Verification Queue"
          value={stats.verificationQueue.toLocaleString()}
          meta="The current review load that can slow down IDs, perks, and downstream flows."
          icon={<Clock size={18} />}
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.24fr_0.76fr]">
        <DashboardChartCard
          title="Member lifecycle overview"
          description="One wide chart is enough here: the superadmin should be able to scan the system state in seconds."
          insight={`${stats.verified.toLocaleString()} verified members are already flowing through the system, while ${stats.incompleteProfiles.toLocaleString()} are still stuck before completion.`}
        >
          <VerificationLifecycleChart stats={stats} />
        </DashboardChartCard>

        <DashboardPanel tone="neutral">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Attention stack
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Use this block for the handful of signals that should change today's priorities.
              </p>
            </div>
            <DashboardPill tone="soft">Leadership view</DashboardPill>
          </div>

          <div className="mt-5">
            <DashboardStatusList
              items={[
                {
                  label: 'Pending verifications',
                  value: stats.verificationQueue.toLocaleString(),
                  meta: 'Approval pressure that blocks IDs and member progression.',
                  tone: 'warning',
                  progress: 100,
                },
                {
                  label: 'Pending merchants',
                  value: stats.merchantStats.pending.toLocaleString(),
                  meta: 'Partners waiting to enter the ecosystem.',
                  tone: 'info',
                  progress: stats.merchantStats.total ? (stats.merchantStats.pending / stats.merchantStats.total) * 100 : 0,
                },
                {
                  label: 'Rejected profiles',
                  value: stats.rejected.toLocaleString(),
                  meta: 'Members who likely need better resubmission support.',
                  tone: 'danger',
                  progress: stats.totalUsers ? (stats.rejected / stats.totalUsers) * 100 : 0,
                },
                {
                  label: 'Archived members',
                  value: stats.archivedUsers.toLocaleString(),
                  meta: 'Members who have aged out and now affect the active base.',
                  tone: 'default',
                  progress: stats.totalUsers ? (stats.archivedUsers / stats.totalUsers) * 100 : 0,
                },
              ]}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <DashboardActionCard
              href="/verification"
              title="Clear verification bottlenecks"
              description="Move the pending queue first so IDs, rewards, and points flows stay healthy."
              icon={<FileText size={18} />}
              badge={stats.verificationQueue > 0 ? `${stats.verificationQueue}` : undefined}
            />
            <DashboardActionCard
              href="/merchants"
              title="Review merchant approvals"
              description="Check partner onboarding, approve high-priority records, and keep the merchant side growing."
              icon={<Store size={18} />}
              badge={stats.merchantStats.pending > 0 ? `${stats.merchantStats.pending}` : undefined}
            />
            <DashboardActionCard
              href="/reports"
              title="Open strategic reports"
              description="Step out of operations mode and inspect demographics, verification health, and system-level trends."
              icon={<BarChart3 size={18} />}
            />
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1.08fr]">
        <DashboardChartCard
          title="Points activity"
          description="Use a simple snapshot chart instead of over-optimizing for analytics before you actually need a time-series API."
          insight={`${topPointsPeriod.label} currently leads with ${topPointsPeriod.value.toLocaleString()} awarded points.`}
        >
          <SnapshotBarChart data={pointsData} />
          <DashboardLegendGrid
            items={pointsData.map((entry) => ({
              label: entry.label,
              value: entry.value.toLocaleString(),
              color: entry.color,
            }))}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Merchant status"
          description="A clean merchant overview is enough here: approved, pending, and total give the fastest read."
          insight={`${approvalRate}% of all merchant records are approved right now.`}
        >
          <SnapshotBarChart data={merchantData} />
          <DashboardLegendGrid
            items={merchantData.map((entry) => ({
              label: entry.label,
              value: entry.value.toLocaleString(),
              color: entry.color,
            }))}
          />
        </DashboardChartCard>

        <DashboardActivityFeed
          title="Recent system activity"
          description="A broader feed than the admin view, so superadmin users can see verification, transaction, and registration movement together."
          items={stats.recentActivity.slice(0, 8)}
          emptyTitle="No recent activity yet"
          emptyDescription="Once members and merchants start moving through the platform, this feed will surface it here."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardChartCard
          title="Age group distribution"
          description="A demographic context card that supports decisions without taking over the top of the page."
          insight={topAgeGroup(stats)}
        >
          <DemographicBarChart data={stats.demographics.ageGroups} />
          <DashboardLegendGrid
            items={stats.demographics.ageGroups.map((entry) => ({
              label: entry.name,
              value: entry.value.toLocaleString(),
              color: 'var(--accent)',
            }))}
          />
        </DashboardChartCard>

        <DashboardChartCard
          title="Gender split"
          description="Keep this as a supporting chart, not a headline chart, so the dashboard stays balanced."
          insight={topGender(stats)}
        >
          <DonutBreakdownChart data={stats.demographics.genderSplit} />
          <DashboardLegendGrid
            items={stats.demographics.genderSplit.map((entry, index) => ({
              label: entry.name,
              value: entry.value.toLocaleString(),
              color: [
                'var(--accent)',
                'var(--accent-strong)',
                'var(--accent-warm)',
                'var(--accent-warm-soft)',
                'rgba(1, 67, 132, 0.42)',
                'rgba(5, 114, 220, 0.34)',
              ][index % 6],
            }))}
          />
        </DashboardChartCard>
      </section>
    </div>
  )
}
