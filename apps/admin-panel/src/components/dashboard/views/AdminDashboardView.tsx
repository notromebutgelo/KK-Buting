import { Check, Clock, FileText, SearchCheck, Users, UserSearch } from 'lucide-react'
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
  VerificationLifecycleChart,
} from '@/components/dashboard/charts'
import type { DashboardStats } from '@/components/dashboard/types'

function topAgeGroup(stats: DashboardStats) {
  const top = [...stats.demographics.ageGroups].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} leads with ${top.value.toLocaleString()} members.` : 'No age group data yet.'
}

function topGender(stats: DashboardStats) {
  const top = [...stats.demographics.genderSplit].sort((a, b) => b.value - a.value)[0]
  return top ? `${top.name} is currently the largest recorded segment.` : 'No gender split data yet.'
}

export default function AdminDashboardView({ stats }: { stats: DashboardStats }) {
  const queueUrgent = stats.verificationQueue > 0
  const recentItems = stats.recentActivity
    .filter((item) => item.type === 'registration' || item.type === 'verification' || item.type === 'document')
    .slice(0, 6)

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageIntro
        eyebrow="Admin workspace"
        title="Focus the day around verification flow, profiling progress, and member records."
        description="Keep the review queue moving, catch incomplete registrations early, and use the dashboard as an operational brief instead of a wall of widgets."
        pills={[
          <DashboardPill key="ops" tone="soft">
            Member operations
          </DashboardPill>,
          <DashboardPill
            key="queue"
            tone={queueUrgent ? 'warning' : 'default'}
            dotColor={queueUrgent ? 'var(--warning-accent)' : 'var(--accent)'}
          >
            {queueUrgent ? 'Queue needs review' : 'Queue under control'}
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <DashboardMiniStat
              label="Pending queue"
              value={stats.verificationQueue.toLocaleString()}
              meta="Documents waiting on review"
              tone={queueUrgent ? 'warning' : 'soft'}
            />
            <DashboardMiniStat
              label="Profiling done"
              value={`${stats.profilingCompletionRate}%`}
              meta={`${stats.profileSubmitted.toLocaleString()} completed`}
              tone="neutral"
            />
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          title="Registered Youth"
          value={stats.totalUsers.toLocaleString()}
          meta="All member accounts currently tracked in the system."
          icon={<Users size={18} />}
          featured
        />
        <DashboardKpiCard
          title="Pending Review"
          value={stats.pending.toLocaleString()}
          meta="Profiles waiting for an approval, rejection, or resubmission request."
          icon={<Clock size={18} />}
          tone="warning"
          badge={queueUrgent ? 'live queue' : undefined}
        />
        <DashboardKpiCard
          title="Verified"
          value={stats.verified.toLocaleString()}
          meta="Members already cleared for digital ID and reward access."
          icon={<Check size={18} />}
          tone="success"
        />
        <DashboardKpiCard
          title="Profiling Completion"
          value={`${stats.profilingCompletionRate}%`}
          meta={`${stats.incompleteProfiles.toLocaleString()} registrations still need completion.`}
          icon={<SearchCheck size={18} />}
          tone="info"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <DashboardChartCard
          title="Verification lifecycle"
          description="A quick view of how members are distributed across the review pipeline today."
          insight={`${stats.pending.toLocaleString()} profiles are awaiting action, while ${stats.rejected.toLocaleString()} need resubmission support.`}
        >
          <VerificationLifecycleChart stats={stats} />
        </DashboardChartCard>

        <DashboardPanel tone="neutral">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Needs attention
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                The right side stays operational: what needs review, what is stalling, and where to jump next.
              </p>
            </div>
            <DashboardPill tone={queueUrgent ? 'warning' : 'soft'}>
              {queueUrgent ? 'Action required' : 'Stable'}
            </DashboardPill>
          </div>

          <div className="mt-5">
            <DashboardStatusList
              items={[
                {
                  label: 'Verification queue',
                  value: stats.verificationQueue.toLocaleString(),
                  meta: 'Pending document reviews and profile decisions.',
                  tone: 'warning',
                  progress: 100,
                },
                {
                  label: 'Rejected profiles',
                  value: stats.rejected.toLocaleString(),
                  meta: 'Members who need guidance and a cleaner retry path.',
                  tone: 'danger',
                  progress: stats.totalUsers ? (stats.rejected / stats.totalUsers) * 100 : 0,
                },
                {
                  label: 'Incomplete registrations',
                  value: stats.incompleteProfiles.toLocaleString(),
                  meta: 'Accounts that started but have not finished profiling yet.',
                  tone: 'info',
                  progress: stats.totalUsers ? (stats.incompleteProfiles / stats.totalUsers) * 100 : 0,
                },
              ]}
            />
          </div>

          <div className="mt-5 grid gap-3">
            <DashboardActionCard
              href="/verification"
              title="Review verification queue"
              description="Open the queue, check the oldest pending submissions, and clear blockers before they age."
              icon={<FileText size={18} />}
              badge={stats.verificationQueue > 0 ? `${stats.verificationQueue}` : undefined}
            />
            <DashboardActionCard
              href="/youth"
              title="Audit member records"
              description="Browse the registry, inspect incomplete profiles, and correct missing or inconsistent member data."
              icon={<UserSearch size={18} />}
            />
          </div>
        </DashboardPanel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <DashboardPanel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                Profiling completion
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                Track how much of the registry is complete enough to move confidently into verification.
              </p>
            </div>
            <DashboardPill tone="soft">Completion focus</DashboardPill>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                  {stats.profilingCompletionRate}%
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  {stats.profileSubmitted.toLocaleString()} completed profiles against {stats.incompleteProfiles.toLocaleString()} still in progress.
                </p>
              </div>
              <DashboardPill tone={stats.profilingCompletionRate >= 70 ? 'success' : 'warning'}>
                {stats.profilingCompletionRate >= 70 ? 'Healthy pace' : 'Needs follow-up'}
              </DashboardPill>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full" style={{ background: 'var(--surface-muted)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(stats.profilingCompletionRate, 5)}%`,
                  background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-strong) 100%)',
                }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <DashboardMiniStat
                label="Completed"
                value={stats.profileSubmitted.toLocaleString()}
                meta="Ready to move through the rest of the flow"
                tone="soft"
              />
              <DashboardMiniStat
                label="Still incomplete"
                value={stats.incompleteProfiles.toLocaleString()}
                meta="These need reminders or cleanup"
                tone="neutral"
              />
            </div>
          </div>
        </DashboardPanel>

        <DashboardActivityFeed
          title="Recent queue activity"
          description="A tighter feed for admin users: only the events that change verification and member readiness."
          items={recentItems}
          emptyTitle="No recent verification movement"
          emptyDescription="New registrations, document uploads, and verification decisions will appear here."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DashboardChartCard
          title="Age group distribution"
          description="Demographic context for the queue and member base, without overloading the main dashboard."
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
          description="A supporting breakdown that helps keep the dashboard informative without becoming too analytical."
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
