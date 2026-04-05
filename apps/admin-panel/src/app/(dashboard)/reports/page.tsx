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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import Spinner from '@/components/ui/Spinner'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
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

const chartPalette = ['#0f6cbd', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#2563eb']

const monthlyConfig = {
  registered: {
    label: 'Registered',
    color: '#0f6cbd',
  },
  verified: {
    label: 'Verified',
    color: '#14b8a6',
  },
} satisfies ChartConfig

const ageConfig = {
  value: {
    label: 'Members',
    color: '#0f6cbd',
  },
} satisfies ChartConfig

const classificationConfig = {
  value: {
    label: 'Members',
    color: '#f59e0b',
  },
} satisfies ChartConfig

const educationConfig = {
  value: {
    label: 'Members',
    color: '#8b5cf6',
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

    return {
      totalProfiles,
      totalVerified,
      pendingOrOther: Math.max(totalProfiles - totalVerified, 0),
      classifications: data.byClassification.length,
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
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-[#0f3f73] via-[#0f6cbd] to-[#14b8a6] p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Admin analytics</p>
        <h1 className="mt-2 text-3xl font-black">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Live KK youth analytics sourced from the backend. These charts are now rendered using the shadcn chart pattern on top of Recharts for cleaner theming and easier reuse.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-bold text-red-900">Reports are unavailable right now</h2>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!error && !hasChartData ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">No report data yet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live analytics will appear here once member profiling and verification records are available.
          </p>
        </div>
      ) : null}

      {!error && hasChartData ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total profiles" value={summary.totalProfiles} accent="bg-[#0f6cbd]" />
            <SummaryCard label="Verified youth" value={summary.totalVerified} accent="bg-[#14b8a6]" />
            <SummaryCard label="Pending or other" value={summary.pendingOrOther} accent="bg-[#f59e0b]" />
            <SummaryCard label="Classification groups" value={summary.classifications} accent="bg-[#8b5cf6]" />
          </div>

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
                      cursor={{ fill: 'rgba(15, 108, 189, 0.08)' }}
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

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-2 w-16 rounded-full ${accent}`} />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900">{value.toLocaleString()}</p>
    </div>
  )
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  )
}
