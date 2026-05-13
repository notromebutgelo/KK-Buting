import type { ReactNode } from 'react'
import { DashboardPageIntro, DashboardPanel, DashboardPill } from '@/components/dashboard/primitives'
import { cn } from '@/utils/cn'

type NoticeTone = 'success' | 'warning' | 'danger' | 'info'
type SurfaceTone = 'default' | 'soft' | 'neutral'

const noticeStyles: Record<NoticeTone, { background: string; border: string; color: string }> = {
  success: {
    background: 'var(--success-bg)',
    border: 'color-mix(in srgb, var(--success-accent) 26%, white 74%)',
    color: 'var(--success-fg)',
  },
  warning: {
    background: 'var(--warning-bg)',
    border: 'color-mix(in srgb, var(--warning-accent) 30%, white 70%)',
    color: 'var(--warning-fg)',
  },
  danger: {
    background: 'var(--danger-bg)',
    border: 'color-mix(in srgb, var(--danger-accent) 26%, white 74%)',
    color: 'var(--danger-fg)',
  },
  info: {
    background: 'var(--info-bg)',
    border: 'color-mix(in srgb, var(--info-accent) 26%, white 74%)',
    color: 'var(--info-fg)',
  },
}

const surfaceStyles: Record<SurfaceTone, string> = {
  default: 'var(--card-solid)',
  soft: 'color-mix(in srgb, var(--card-solid) 95%, var(--accent-soft) 5%)',
  neutral: 'color-mix(in srgb, var(--card-solid) 95%, var(--surface-muted) 5%)',
}

export function AdminPageIntro({
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
    <DashboardPageIntro
      eyebrow={eyebrow}
      title={title}
      description={description}
      pills={pills}
      aside={aside}
    />
  )
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>
}

export function AdminStatCard({
  label,
  value,
  meta,
  accent = 'var(--accent)',
}: {
  label: string
  value: string | number
  meta?: string
  accent?: string
}) {
  return (
    <DashboardPanel className="relative">
      <div
        className="absolute left-0 top-0 h-1.5 w-full rounded-t-[var(--radius-lg)]"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 72%)` }}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      {meta ? (
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {meta}
        </p>
      ) : null}
    </DashboardPanel>
  )
}

export function AdminFilterBar({
  children,
  columns = 'lg:grid-cols-4',
}: {
  children: ReactNode
  columns?: string
}) {
  return (
    <DashboardPanel tone="neutral">
      <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', columns)}>{children}</div>
    </DashboardPanel>
  )
}

export function AdminField({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AdminSurface({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: SurfaceTone
  className?: string
}) {
  return (
    <section
      className={cn('overflow-hidden rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)] sm:p-6', className)}
      style={{
        background: surfaceStyles[tone],
        borderColor: 'var(--stroke)',
      }}
    >
      {children}
    </section>
  )
}

export function AdminSurfaceHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
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
  )
}

export function AdminTabBar<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T
  onChange: (value: T) => void
  tabs: Array<{ id: T; label: string; count?: number }>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              background: active ? 'var(--accent)' : 'var(--card)',
              borderColor: active ? 'var(--accent)' : 'var(--stroke)',
              color: active ? '#ffffff' : 'var(--ink-soft)',
            }}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span
                className="ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: active ? 'rgba(255,255,255,0.18)' : 'var(--surface-muted)',
                  color: active ? '#ffffff' : 'var(--muted)',
                }}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function AdminNotice({
  tone,
  children,
}: {
  tone: NoticeTone
  children: ReactNode
}) {
  const palette = noticeStyles[tone]

  return (
    <div
      className="rounded-2xl border px-4 py-3 text-sm leading-6"
      style={{ background: palette.background, borderColor: palette.border, color: palette.color }}
    >
      {children}
    </div>
  )
}

export function AdminTableShell({
  children,
  minWidth,
}: {
  children: ReactNode
  minWidth?: string
}) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-md)] border"
      style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}
    >
      <div className="overflow-x-auto">
        <div style={minWidth ? { minWidth } : undefined}>{children}</div>
      </div>
    </div>
  )
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </p>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  )
}

export function AdminTableStat({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'warning' | 'success' | 'danger'
}) {
  const pillTone =
    tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'default'
  return <DashboardPill tone={pillTone}>{children}</DashboardPill>
}
