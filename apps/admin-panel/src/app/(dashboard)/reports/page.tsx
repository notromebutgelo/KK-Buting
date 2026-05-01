'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageIntro,
  AdminStatCard,
  AdminStatGrid,
  AdminSurface,
  AdminSurfaceHeader,
} from '@/components/admin/workspace'
import { DashboardMiniStat, DashboardPill } from '@/components/dashboard/primitives'
import api from '@/lib/api'

interface ReportDatum {
  name: string
  value: number
}

interface ReportData {
  byAgeGroup: ReportDatum[]
  byStatus: ReportDatum[]
  byClassification: ReportDatum[]
  byEducation: ReportDatum[]
  monthlySummary?: { month: string; registered: number; verified: number }[]
}

const chartPalette = [
  'var(--accent)',
  'var(--accent-strong)',
  'var(--accent-warm)',
  'var(--accent-warm-soft)',
  'rgba(1, 67, 132, 0.42)',
  'rgba(5, 114, 220, 0.34)',
  'rgba(252, 179, 21, 0.34)',
]

const monthlyConfig = {
  registered: {
    label: 'Registered',
    color: 'var(--accent)',
  },
  verified: {
    label: 'Verified',
    color: 'var(--accent-strong)',
  },
} satisfies ChartConfig

const ageConfig = {
  value: {
    label: 'Members',
    color: 'var(--accent)',
  },
} satisfies ChartConfig

const classificationConfig = {
  value: {
    label: 'Members',
    color: 'var(--accent)',
  },
} satisfies ChartConfig

const educationConfig = {
  value: {
    label: 'Members',
    color: 'var(--accent)',
  },
} satisfies ChartConfig

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadReports() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await api.get('/admin/reports')
      setData(res.data)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load live reports from the backend.'
      setData(null)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [])

  const hasChartData = Boolean(
    data &&
      [
        data.byAgeGroup.length,
        data.byStatus.length,
        data.byClassification.length,
        data.byEducation.length,
        data.monthlySummary?.length || 0,
      ].some((count) => count > 0)
  )

  const summary = useMemo(() => {
    if (!data) {
      return {
        totalProfiles: 0,
        totalVerified: 0,
        pendingOrOther: 0,
        classifications: 0,
        topAgeGroup: 'No age group data yet',
        topEducation: 'No education data yet',
      }
    }

    const totalProfiles = [
      data.byStatus,
      data.byAgeGroup,
      data.byClassification,
      data.byEducation,
    ].find((group) => group.length > 0)?.reduce((sum, item) => sum + item.value, 0) || 0

    const totalVerified =
      data.byStatus.find((item) => item.name.toLowerCase() === 'verified')?.value || 0

    const topAgeGroup = [...data.byAgeGroup].sort((a, b) => b.value - a.value)[0]
    const topEducation = [...data.byEducation].sort((a, b) => b.value - a.value)[0]

    return {
      totalProfiles,
      totalVerified,
      pendingOrOther: Math.max(totalProfiles - totalVerified, 0),
      classifications: data.byClassification.length,
      topAgeGroup: topAgeGroup ? `${topAgeGroup.name} leads the registry.` : 'No age group data yet',
      topEducation: topEducation ? `${topEducation.name} is the strongest education segment.` : 'No education data yet',
    }
  }, [data])

  const statusConfig = useMemo(
    () =>
      (data?.byStatus || []).reduce((config, item, index) => {
        config[item.name] = {
          label: item.name,
          color: chartPalette[index % chartPalette.length],
        }
        return config
      }, {} as ChartConfig),
    [data]
  )

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <AdminSurface>
          <div className="h-28 animate-pulse rounded-3xl" style={{ background: 'var(--surface-muted)' }} />
        </AdminSurface>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="admin-panel h-36 animate-pulse"
              style={{ background: 'color-mix(in srgb, var(--card) 90%, transparent)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageIntro
        eyebrow="Analytics workspace"
        title="Track the registry with calmer charts, clearer comparisons, and fewer distractions."
        description="This page is meant to answer leadership questions quickly: how many members are in the system, which segments dominate, and where verification and registration activity are moving."
        pills={[
          <DashboardPill key="live" tone="soft">
            Live backend data
          </DashboardPill>,
          <DashboardPill key="scope" tone="default">
            Superadmin reporting
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <DashboardMiniStat
              label="Verified"
              value={summary.totalVerified.toLocaleString()}
              meta="Members cleared in the system"
              tone="soft"
            />
            <DashboardMiniStat
              label="Pending / other"
              value={summary.pendingOrOther.toLocaleString()}
              meta="Still moving through the funnel"
              tone="neutral"
            />
          </div>
        }
      />

      {error ? (
        <AdminNotice tone="danger">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Reports are unavailable right now.</p>
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold"
              style={{ color: '#b91c1c' }}
            >
              Retry
            </button>
          </div>
        </AdminNotice>
      ) : null}

      {!error && !hasChartData ? (
        <AdminSurface>
          <AdminSurfaceHeader
            title="No report data yet"
            description="Live analytics will appear here once member profiling and verification records are available."
          />
          <div className="mt-5">
            <AdminEmptyState
              title="Waiting for analytics"
              description="As soon as the registry has enough live member data, the charts and summary cards will populate here."
            />
          </div>
        </AdminSurface>
      ) : null}

      {!error && hasChartData ? (
        <>
          <AdminStatGrid>
            <AdminStatCard
              label="Total profiles"
              value={summary.totalProfiles.toLocaleString()}
              meta="All profiles represented across the live report data."
              accent="var(--accent)"
            />
            <AdminStatCard
              label="Verified youth"
              value={summary.totalVerified.toLocaleString()}
              meta="Members that have completed enough steps to be counted as verified."
              accent="var(--accent-strong)"
            />
            <AdminStatCard
              label="Pending or other"
              value={summary.pendingOrOther.toLocaleString()}
              meta="Profiles still in progress, pending, or outside the verified state."
              accent="var(--accent-warm)"
            />
            <AdminStatCard
              label="Classification groups"
              value={summary.classifications.toLocaleString()}
              meta="Distinct youth classifications represented in the current dataset."
              accent="rgba(1, 67, 132, 0.42)"
            />
          </AdminStatGrid>

          {data?.monthlySummary && data.monthlySummary.length > 0 ? (
            <ChartPanel
              title="Monthly registration trend"
              description="Tracks registrations versus successful verifications month by month."
            >
              <ChartContainer config={monthlyConfig} className="min-h-[320px] w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart accessibilityLayer data={data.monthlySummary} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip
                      cursor={{ fill: 'rgba(22, 115, 79, 0.08)' }}
                      content={<ChartTooltipContent />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="registered" fill="var(--color-registered)" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="verified" fill="var(--color-verified)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartPanel>
          ) : null}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr,0.85fr]">
            <ChartPanel
              title="Youth by age group"
              description="Shows which age bands are most represented in the registry."
              insight={summary.topAgeGroup}
            >
              <ChartContainer config={ageConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart accessibilityLayer data={data?.byAgeGroup || []} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel valueFormatter={(value) => `${value} members`} />}
                    />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartPanel>

            <ChartPanel
              title="Verification status mix"
              description="A quick snapshot of verified, pending, and rejected records."
            >
              <ChartContainer config={statusConfig} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent valueFormatter={(value) => `${value} records`} />}
                    />
                    <Pie
                      data={data?.byStatus || []}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={104}
                      paddingAngle={4}
                    >
                      {(data?.byStatus || []).map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={statusConfig[entry.name]?.color || chartPalette[index % chartPalette.length]}
                        />
                      ))}
                    </Pie>
                    <Legend content={<ChartLegendContent className="justify-center" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartPanel>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ChartPanel
              title="Youth classification"
              description="Breaks down member records by classification."
            >
              <ChartContainer config={classificationConfig} className="min-h-[340px] w-full">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart accessibilityLayer data={data?.byClassification || []} layout="vertical" margin={{ left: 24, right: 8 }}>
                    <CartesianGrid horizontal strokeDasharray="4 4" />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel valueFormatter={(value) => `${value} members`} />}
                    />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartPanel>

            <ChartPanel
              title="Educational background"
              description="Highlights the strongest educational segments in the current dataset."
              insight={summary.topEducation}
            >
              <ChartContainer config={educationConfig} className="min-h-[340px] w-full">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart accessibilityLayer data={data?.byEducation || []} layout="vertical" margin={{ left: 24, right: 8 }}>
                    <CartesianGrid horizontal strokeDasharray="4 4" />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={132}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel valueFormatter={(value) => `${value} members`} />}
                    />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </ChartPanel>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ChartPanel({
  title,
  description,
  children,
  insight,
}: {
  title: string
  description: string
  children: React.ReactNode
  insight?: string
}) {
  return (
    <AdminSurface>
      <AdminSurfaceHeader title={title} description={description} />
      <div className="mt-5">{children}</div>
      {insight ? (
        <div
          className="mt-5 rounded-2xl border px-4 py-3 text-sm leading-6"
          style={{
            background: 'color-mix(in srgb, var(--surface-muted) 76%, transparent)',
            borderColor: 'var(--stroke)',
            color: 'var(--ink-soft)',
          }}
        >
          {insight}
        </div>
      ) : null}
    </AdminSurface>
  )
}
