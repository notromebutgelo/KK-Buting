import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type PanelTone = 'default' | 'soft' | 'neutral' | 'warning' | 'danger'
type PillTone = 'default' | 'soft' | 'success' | 'warning' | 'danger'
type KpiTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const panelStyles: Record<PanelTone, string> = {
  default: 'var(--card)',
  soft: 'color-mix(in srgb, var(--accent-soft) 72%, var(--card-solid) 28%)',
  neutral: 'color-mix(in srgb, var(--surface-muted) 82%, var(--card-solid) 18%)',
  warning: 'color-mix(in srgb, var(--warning-bg) 82%, var(--card-solid) 18%)',
  danger: 'color-mix(in srgb, var(--danger-bg) 82%, var(--card-solid) 18%)',
}

const pillStyles: Record<PillTone, { background: string; color: string }> = {
  default: { background: 'var(--card-solid)', color: 'var(--ink-soft)' },
  soft: { background: 'var(--accent-soft)', color: 'var(--accent-strong)' },
  success: { background: 'var(--success-bg)', color: 'var(--success-fg)' },
  warning: { background: 'var(--warning-bg)', color: 'var(--warning-fg)' },
  danger: { background: 'var(--danger-bg)', color: 'var(--danger-fg)' },
}

const kpiToneStyles: Record<KpiTone, { iconBg: string; iconFg: string; accent: string }> = {
  default: {
    iconBg: 'var(--accent-soft)',
    iconFg: 'var(--accent-strong)',
    accent: 'var(--accent)',
  },
  success: {
    iconBg: 'var(--success-bg)',
    iconFg: 'var(--success-fg)',
    accent: 'var(--success-accent)',
  },
  warning: {
    iconBg: 'var(--warning-bg)',
    iconFg: 'var(--warning-fg)',
    accent: 'var(--warning-accent)',
  },
  danger: {
    iconBg: 'var(--danger-bg)',
    iconFg: 'var(--danger-fg)',
    accent: 'var(--danger-accent)',
  },
  info: {
    iconBg: 'var(--info-bg)',
    iconFg: 'var(--info-fg)',
    accent: 'var(--info-accent)',
  },
}

export function DashboardPanel({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: PanelTone
}) {
  return (
    <section
      className={`overflow-hidden rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)] sm:p-6 ${className}`}
      style={{
        background: panelStyles[tone],
        borderColor: 'var(--stroke)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {children}
    </section>
  )
}

export function DashboardPill({
  children,
  tone = 'default',
  dotColor,
}: {
  children: ReactNode
  tone?: PillTone
  dotColor?: string
}) {
  const palette = pillStyles[tone]

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
      style={{
        background: palette.background,
        color: palette.color,
        borderColor: 'color-mix(in srgb, var(--stroke) 78%, transparent)',
      }}
    >
      {dotColor ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} /> : null}
      {children}
    </span>
  )
}

export function DashboardMiniStat({
  label,
  value,
  meta,
  tone = 'default',
}: {
  label: string
  value: string | number
  meta?: string
  tone?: PanelTone
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        background: panelStyles[tone],
        borderColor: 'var(--stroke)',
      }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      {meta ? (
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
          {meta}
        </p>
      ) : null}
    </div>
  )
}

export function DashboardPageIntro({
  eyebrow,
  title,
  description,
  pills = [],
  aside,
}: {
  eyebrow: string
  title: string
  description: string
  pills?: ReactNode[]
  aside?: ReactNode
}) {
  return (
    <DashboardPanel className="relative">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(5, 114, 220, 0.12), transparent 34%), radial-gradient(circle at bottom right, rgba(252, 179, 21, 0.16), transparent 28%)',
        }}
      />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--accent-strong)' }}>
            {eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[2rem]" style={{ color: 'var(--ink)' }}>
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 sm:text-[0.95rem]" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
          {pills.length ? <div className="mt-5 flex flex-wrap gap-2.5">{pills}</div> : null}
        </div>
        {aside ? <div className="xl:min-w-[320px]">{aside}</div> : null}
      </div>
    </DashboardPanel>
  )
}

export function DashboardKpiCard({
  title,
  value,
  meta,
  icon,
  tone = 'default',
  badge,
  featured = false,
}: {
  title: string
  value: string | number
  meta: string
  icon?: ReactNode
  tone?: KpiTone
  badge?: string
  featured?: boolean
}) {
  const palette = kpiToneStyles[tone]

  return (
    <DashboardPanel className="relative">
      <div
        className="absolute left-0 top-0 h-1.5 w-full rounded-t-[var(--radius-lg)]"
        style={{ background: `linear-gradient(90deg, ${palette.accent} 0%, transparent 70%)` }}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
            {title}
          </p>
          <p
            className={`mt-3 font-semibold tracking-tight ${featured ? 'text-4xl sm:text-[2.7rem]' : 'text-3xl sm:text-[2.15rem]'}`}
            style={{ color: 'var(--ink)' }}
          >
            {value}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {badge ? <DashboardPill tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'soft'}>{badge}</DashboardPill> : null}
          {icon ? (
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{ background: palette.iconBg, color: palette.iconFg }}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6" style={{ color: 'var(--muted)' }}>
        {meta}
      </p>
    </DashboardPanel>
  )
}

export function DashboardChartCard({
  title,
  description,
  children,
  action,
  insight,
  className = '',
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  insight?: string
  className?: string
}) {
  return (
    <DashboardPanel className={className}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
      {insight ? (
        <div
          className="mt-5 rounded-2xl border px-4 py-3 text-sm leading-6"
          style={{
            background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
            borderColor: 'var(--stroke)',
            color: 'var(--ink-soft)',
          }}
        >
          {insight}
        </div>
      ) : null}
    </DashboardPanel>
  )
}

export function DashboardStatusList({
  items,
}: {
  items: Array<{
    label: string
    value: string | number
    meta?: string
    tone?: KpiTone
    progress?: number
  }>
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const palette = kpiToneStyles[item.tone || 'default']

        return (
          <div
            key={item.label}
            className="rounded-2xl border px-4 py-3"
            style={{
              background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
              borderColor: 'var(--stroke)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {item.label}
                </p>
                {item.meta ? (
                  <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                    {item.meta}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
                  {item.value}
                </p>
              </div>
            </div>
            {typeof item.progress === 'number' ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--card-solid)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.max(item.progress, 0), 100)}%`,
                    background: palette.accent,
                  }}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function DashboardActionCard({
  href,
  title,
  description,
  icon,
  badge,
}: {
  href: string
  title: string
  description: string
  icon: ReactNode
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]"
      style={{
        background: 'color-mix(in srgb, var(--card-solid) 84%, transparent)',
        borderColor: 'var(--stroke)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-2xl"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {badge ? <DashboardPill tone="soft">{badge}</DashboardPill> : null}
          <ArrowRight size={16} style={{ color: 'var(--muted)' }} />
        </div>
      </div>
      <h3 className="mt-4 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
        {description}
      </p>
    </Link>
  )
}

export function DashboardEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-2xl border border-dashed px-5 py-12 text-center"
      style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  )
}
