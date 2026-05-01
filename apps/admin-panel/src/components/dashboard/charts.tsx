'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartTooltipStyle } from '@/components/ui/chart'
import type { DashboardStats } from '@/components/dashboard/types'

type LegendItem = {
  label: string
  value: string
  color: string
}

type SnapshotDatum = {
  label: string
  value: number
  color: string
}

const DONUT_COLORS = [
  'var(--accent)',
  'var(--accent-strong)',
  'var(--accent-warm)',
  'var(--accent-warm-soft)',
  'rgba(1, 67, 132, 0.42)',
  'rgba(5, 114, 220, 0.34)',
]

function axisTick() {
  return { fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

export function DashboardLegendGrid({ items }: { items: LegendItem[] }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-2xl border px-3 py-2.5"
          style={{
            background: 'color-mix(in srgb, var(--surface-muted) 76%, transparent)',
            borderColor: 'var(--stroke)',
          }}
        >
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function VerificationLifecycleChart({ stats }: { stats: DashboardStats }) {
  const data = useMemo(
    () => [
      { label: 'Verified', value: stats.verified, color: 'var(--success-accent)' },
      { label: 'Pending', value: stats.pending, color: 'var(--warning-accent)' },
      { label: 'Rejected', value: stats.rejected, color: 'var(--danger-accent)' },
      { label: 'Incomplete', value: stats.incompleteProfiles, color: 'rgba(1, 67, 132, 0.34)' },
    ],
    [stats]
  )

  return (
    <ResponsiveContainer width="100%" height={286}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={axisTick()}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={84}
          axisLine={false}
          tickLine={false}
          tick={axisTick()}
        />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatNumber(value)} />
        <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={18}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: number) => formatNumber(value)}
            className="fill-[var(--ink)] text-xs font-semibold"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SnapshotBarChart({
  data,
  height = 240,
}: {
  data: SnapshotDatum[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 10, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={axisTick()}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={axisTick()}
        />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatNumber(value)} />
        <Bar dataKey="value" radius={[12, 12, 4, 4]} maxBarSize={46}>
          {data.map((entry) => (
            <Cell key={entry.label} fill={entry.color} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatNumber(value)}
            className="fill-[var(--ink)] text-xs font-semibold"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DemographicBarChart({
  data,
  color = 'var(--accent)',
  height = 248,
}: {
  data: Array<{ name: string; value: number }>
  color?: string
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted)', fontSize: 11, fontWeight: 600 }}
          interval={0}
          angle={-8}
          textAnchor="end"
          height={48}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={axisTick()}
        />
        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatNumber(value)} />
        <Bar dataKey="value" fill={color} radius={[10, 10, 0, 0]} maxBarSize={50} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DonutBreakdownChart({
  data,
  height = 240,
}: {
  data: Array<{ name: string; value: number }>
  height?: number
}) {
  const normalized = data.filter((entry) => entry.value > 0)
  const chartData = normalized.length ? normalized : [{ name: 'No data', value: 1 }]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={54}
          outerRadius={86}
          paddingAngle={3}
          strokeWidth={0}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`${entry.name}-${index}`}
              fill={normalized.length ? DONUT_COLORS[index % DONUT_COLORS.length] : '#cbd5e1'}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatNumber(value)} />
      </PieChart>
    </ResponsiveContainer>
  )
}
