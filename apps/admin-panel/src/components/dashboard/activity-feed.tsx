import { FileText, ShieldCheck, UserPlus2, Users, Zap } from 'lucide-react'
import { DashboardEmptyState, DashboardPanel, DashboardPill } from '@/components/dashboard/primitives'
import type { DashboardActivity } from '@/components/dashboard/types'

type ActivityPillTone = 'default' | 'soft' | 'success' | 'warning' | 'danger'

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

function activityMeta(activity: DashboardActivity) {
  if (activity.type === 'verification') {
    const pillTone: ActivityPillTone =
      activity.status === 'rejected' ? 'danger' : activity.status === 'verified' ? 'success' : 'warning'

    return {
      icon: ShieldCheck,
      bg: activity.status === 'rejected' ? '#fff1f2' : activity.status === 'verified' ? '#ecfdf5' : '#fff7ed',
      fg: activity.status === 'rejected' ? '#be123c' : activity.status === 'verified' ? '#047857' : '#b45309',
      pillTone,
      pillLabel: activity.status || 'reviewed',
    }
  }

  if (activity.type === 'document') {
    return {
      icon: FileText,
      bg: 'var(--accent-soft)',
      fg: 'var(--accent-strong)',
      pillTone: 'soft' as const,
      pillLabel: 'document',
    }
  }

  if (activity.type === 'transaction') {
    return {
      icon: Zap,
      bg: '#eff6ff',
      fg: '#1d4ed8',
      pillTone: 'default' as const,
      pillLabel: 'transaction',
    }
  }

  if (activity.type === 'registration') {
    return {
      icon: UserPlus2,
      bg: 'var(--accent-soft)',
      fg: 'var(--accent-strong)',
      pillTone: 'soft' as const,
      pillLabel: 'registration',
    }
  }

  return {
    icon: Users,
    bg: 'var(--surface-muted)',
    fg: 'var(--ink-soft)',
    pillTone: 'default' as const,
    pillLabel: activity.type || 'activity',
  }
}

export function DashboardActivityFeed({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  items: DashboardActivity[]
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <DashboardPanel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
        <DashboardPill tone="default">{items.length} items</DashboardPill>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {items.length === 0 ? (
          <DashboardEmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          items.map((activity) => {
            const meta = activityMeta(activity)
            const Icon = meta.icon

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-2xl border px-4 py-3"
                style={{
                  background: 'color-mix(in srgb, var(--surface-muted) 76%, transparent)',
                  borderColor: 'var(--stroke)',
                }}
              >
                <div
                  className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                  style={{ background: meta.bg, color: meta.fg }}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold leading-6" style={{ color: 'var(--ink)' }}>
                      {activity.title}
                    </p>
                    <DashboardPill tone={meta.pillTone}>{meta.pillLabel}</DashboardPill>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </DashboardPanel>
  )
}
