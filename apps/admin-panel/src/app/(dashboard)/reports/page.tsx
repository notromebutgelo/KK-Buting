'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BadgeCheck,
  ClipboardList,
  Download,
  FileClock,
  RefreshCw,
  RotateCcw,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  AdminEmptyState,
  AdminField,
  AdminFilterBar,
  AdminNotice,
  AdminPageIntro,
  AdminSurface,
  AdminSurfaceHeader,
} from '@/components/admin/workspace'
import { DashboardMiniStat, DashboardPill, DashboardStatusList } from '@/components/dashboard/primitives'
import api from '@/lib/api'

interface ReportDatum {
  name: string
  value: number
}

interface MonthlySummaryDatum {
  month: string
  registered: number
  verified: number
}

interface ReportSummary {
  totalRegisteredUsers: number
  verifiedUsers: number
  pendingVerifications: number
  activeMerchants: number
  monthlyGrowthPercent: number
  surveyCompletionRate: number
  verificationRate: number
  currentMonthRegistered: number
  currentMonthVerified: number
  currentMonthLabel: string
}

interface ReportFiltersPayload {
  applied: {
    dateFrom: string
    dateTo: string
    barangay: string
    ageGroup: string
    gender: string
    status: string
  }
  options: {
    barangays: string[]
    ageGroups: string[]
    genders: string[]
    statuses: string[]
  }
}

interface ReportData {
  summary?: ReportSummary
  filters?: ReportFiltersPayload
  byAgeGroup: ReportDatum[]
  byBarangay?: ReportDatum[]
  byStatus: ReportDatum[]
  byClassification: ReportDatum[]
  byEducation: ReportDatum[]
  byGender?: ReportDatum[]
  byWorkStatus?: ReportDatum[]
  byStudyStatus?: ReportDatum[]
  outOfSchoolReasons?: ReportDatum[]
  learningPathways?: ReportDatum[]
  civicEngagement?: ReportDatum[]
  monthlySummary?: MonthlySummaryDatum[]
}

type PdfDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number
  }
}

type FilterState = {
  dateFrom: string
  dateTo: string
  barangay: string
  ageGroup: string
  gender: string
  status: string
}

type ExportSectionKey =
  | 'summaryCards'
  | 'executiveSummary'
  | 'monthlyTrend'
  | 'ageGroup'
  | 'barangay'
  | 'gender'
  | 'education'
  | 'workStatus'
  | 'outOfSchool'
  | 'learning'
  | 'civic'

type ExportSectionState = Record<ExportSectionKey, boolean>

type ExportConfig = {
  filters: FilterState
  sections: ExportSectionState
  includeBreakdownTables: boolean
  reportFormat: 'visual' | 'tabular'
}

type PdfChartVariant =
  | 'columns'
  | 'rankedBars'
  | 'donut'
  | 'lollipop'
  | 'stackedBar'
  | 'stepBars'
  | 'bubbleCluster'
  | 'dotGrid'

const REPORT_COLORS = [
  '#2563EB',
  '#0EA5E9',
  '#14B8A6',
  '#22C55E',
  '#F59E0B',
  '#FB7185',
  '#8B5CF6',
  '#6366F1',
] as const

const BAR_CONFIG = {
  value: {
    label: 'Members',
    color: REPORT_COLORS[0],
  },
} satisfies ChartConfig

const MONTHLY_CONFIG = {
  registered: {
    label: 'Registered',
    color: REPORT_COLORS[0],
  },
  verified: {
    label: 'Verified',
    color: REPORT_COLORS[2],
  },
} satisfies ChartConfig

const CATEGORY_LIMIT = 6
const DEFAULT_FILTERS: FilterState = {
  dateFrom: '',
  dateTo: '',
  barangay: 'all',
  ageGroup: 'all',
  gender: 'all',
  status: 'all',
}

const DEFAULT_REPORT_SUMMARY: ReportSummary = {
  totalRegisteredUsers: 0,
  verifiedUsers: 0,
  pendingVerifications: 0,
  activeMerchants: 0,
  monthlyGrowthPercent: 0,
  surveyCompletionRate: 0,
  verificationRate: 0,
  currentMonthRegistered: 0,
  currentMonthVerified: 0,
  currentMonthLabel: 'Latest reporting month',
}

const DEFAULT_EXPORT_SECTIONS: ExportSectionState = {
  summaryCards: true,
  executiveSummary: true,
  monthlyTrend: true,
  ageGroup: true,
  barangay: true,
  gender: true,
  education: true,
  workStatus: true,
  outOfSchool: true,
  learning: true,
  civic: true,
}

const SUMMARY_EXPORT_OPTIONS: Array<{
  key: ExportSectionKey
  label: string
  description: string
}> = [
  {
    key: 'summaryCards',
    label: 'KPI summary cards',
    description: 'Include the headline totals for registrations, verification, merchants, growth, and completion.',
  },
  {
    key: 'executiveSummary',
    label: 'Executive summary',
    description: 'Add a short narrative that summarizes the filtered reporting picture.',
  },
  {
    key: 'monthlyTrend',
    label: 'Trend section',
    description: 'Include the monthly registrations-versus-verifications timeline and counts table.',
  },
]

const ANALYTICS_EXPORT_OPTIONS: Array<{
  key: ExportSectionKey
  label: string
  description: string
}> = [
  {
    key: 'ageGroup',
    label: 'Age-group distribution',
    description: 'Show which youth age bands are most represented in the filtered registry.',
  },
  {
    key: 'barangay',
    label: 'Top barangays',
    description: 'Include the barangays contributing the highest concentration of registered youth.',
  },
  {
    key: 'gender',
    label: 'Gender distribution',
    description: 'Break down the reported gender mix captured in KK profiling submissions.',
  },
  {
    key: 'education',
    label: 'Educational background',
    description: 'Summarize the strongest education segments represented in the selected dataset.',
  },
  {
    key: 'workStatus',
    label: 'Employment status',
    description: 'Show employment, unemployment, and active job-seeking signals.',
  },
  {
    key: 'outOfSchool',
    label: 'Out-of-school reasons',
    description: 'Highlight the leading reasons youth members are currently not enrolled.',
  },
  {
    key: 'learning',
    label: 'Skills and training interests',
    description: 'Include scholarship, vocational, academic-track, and business-interest signals.',
  },
  {
    key: 'civic',
    label: 'Barangay engagement insights',
    description: 'Summarize voting, KK assembly, and volunteer participation signals.',
  },
]

function buildReportQueryParams(filters: FilterState) {
  return {
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(filters.barangay !== 'all' ? { barangay: filters.barangay } : {}),
    ...(filters.ageGroup !== 'all' ? { ageGroup: filters.ageGroup } : {}),
    ...(filters.gender !== 'all' ? { gender: filters.gender } : {}),
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
  }
}

function createExportConfig(baseFilters: FilterState = DEFAULT_FILTERS): ExportConfig {
  return {
    filters: { ...baseFilters },
    sections: { ...DEFAULT_EXPORT_SECTIONS },
    includeBreakdownTables: true,
    reportFormat: 'visual',
  }
}

function hasEnabledExportSection(sections: ExportSectionState) {
  return Object.values(sections).some(Boolean)
}

function areFiltersEqual(left: FilterState, right: FilterState) {
  return (
    left.dateFrom === right.dateFrom &&
    left.dateTo === right.dateTo &&
    left.barangay === right.barangay &&
    left.ageGroup === right.ageGroup &&
    left.gender === right.gender &&
    left.status === right.status
  )
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isReportBuilderOpen, setIsReportBuilderOpen] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [exportConfig, setExportConfig] = useState<ExportConfig>(() => createExportConfig(DEFAULT_FILTERS))

  const queryParams = useMemo(() => buildReportQueryParams(filters), [filters])

  async function loadReports() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await api.get('/admin/reports', { params: queryParams })
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
  }, [queryParams])

  const filterOptions = data?.filters?.options || {
    barangays: [],
    ageGroups: [],
    genders: [],
    statuses: [],
  }

  const byAgeGroup = data?.byAgeGroup || []
  const byBarangay = data?.byBarangay || []
  const byStatus = data?.byStatus || []
  const byEducation = data?.byEducation || []
  const byGender = data?.byGender || []
  const byWorkStatus = data?.byWorkStatus || []
  const byStudyStatus = data?.byStudyStatus || []
  const outOfSchoolReasons = data?.outOfSchoolReasons || []
  const learningPathways = data?.learningPathways || []
  const civicEngagement = data?.civicEngagement || []
  const monthlySummary = data?.monthlySummary || []

  const hasChartData = [
    byAgeGroup.length,
    byBarangay.length,
    byStatus.length,
    byEducation.length,
    byGender.length,
    byWorkStatus.length,
    byStudyStatus.length,
    outOfSchoolReasons.length,
    learningPathways.length,
    civicEngagement.length,
    monthlySummary.length,
  ].some((count) => count > 0)

  const summary = useMemo<ReportSummary>(
    () => data?.summary || DEFAULT_REPORT_SUMMARY,
    [data]
  )

  const insights = useMemo(
    () => ({
      topAgeGroup: buildLeadingInsight(byAgeGroup, 'currently leads the registry.'),
      topBarangay: buildLeadingInsight(byBarangay, 'currently has the highest registered youth count.'),
      topEducation: buildLeadingInsight(
        byEducation,
        'is the strongest education segment in the filtered reporting dataset.'
      ),
      topGender: buildLeadingInsight(
        byGender,
        'currently represents the largest reported gender segment.'
      ),
      topWorkStatus: buildLeadingInsight(
        byWorkStatus,
        'is the largest employment segment in the current registry.'
      ),
      topOutOfSchoolReason: buildLeadingInsight(
        outOfSchoolReasons,
        'is the leading reported reason for being out of school.'
      ),
      topPathway: buildLeadingInsight(
        learningPathways,
        'is the strongest training or livelihood pathway signal right now.'
      ),
      topCivicSignal: buildLeadingInsight(
        civicEngagement,
        'is the clearest barangay-engagement signal in current profiles.'
      ),
    }),
    [
      byAgeGroup,
      byBarangay,
      byEducation,
      byGender,
      byWorkStatus,
      outOfSchoolReasons,
      learningPathways,
      civicEngagement,
    ]
  )

  const ageChartData = byAgeGroup
  const barangayChartData = getTopItems(byBarangay, CATEGORY_LIMIT)
  const genderChartData = byGender
  const educationChartData = getTopItems(byEducation, CATEGORY_LIMIT)
  const workChartData = byWorkStatus
  const outOfSchoolChartData = getTopItems(outOfSchoolReasons, CATEGORY_LIMIT)
  const learningChartData = learningPathways
  const civicChartData = civicEngagement

  const genderConfig = useMemo(() => buildConfigFromData(genderChartData), [genderChartData])

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const openReportBuilder = () => {
    setExportConfig(createExportConfig(filters))
    setExportError(null)
    setIsReportBuilderOpen(true)
  }

  const closeReportBuilder = () => {
    if (isExporting) {
      return
    }

    setIsReportBuilderOpen(false)
    setExportError(null)
  }

  const generatePdfReport = async () => {
    if (!hasEnabledExportSection(exportConfig.sections)) {
      setExportError('Select at least one summary or analytics section before generating the PDF report.')
      return
    }

    setIsExporting(true)
    setExportError(null)

    try {
      const exportData: ReportData =
        data && areFiltersEqual(exportConfig.filters, filters)
          ? data
          : (
              await api.get('/admin/reports', {
                params: buildReportQueryParams(exportConfig.filters),
              })
            ).data

      const exportSummary = exportData?.summary || DEFAULT_REPORT_SUMMARY
      const exportByAgeGroup = exportData?.byAgeGroup || []
      const exportByBarangay = exportData?.byBarangay || []
      const exportByGender = exportData?.byGender || []
      const exportByEducation = exportData?.byEducation || []
      const exportByWorkStatus = exportData?.byWorkStatus || []
      const exportOutOfSchoolReasons = exportData?.outOfSchoolReasons || []
      const exportLearningPathways = exportData?.learningPathways || []
      const exportCivicEngagement = exportData?.civicEngagement || []
      const exportMonthlySummary = exportData?.monthlySummary || []
      const showVisualCharts = exportConfig.reportFormat === 'visual'
      const includeTables = showVisualCharts ? exportConfig.includeBreakdownTables : true

      const exportAgeChartData = exportByAgeGroup
      const exportBarangayChartData = getTopItems(exportByBarangay, CATEGORY_LIMIT)
      const exportGenderChartData = exportByGender
      const exportEducationChartData = getTopItems(exportByEducation, CATEGORY_LIMIT)
      const exportWorkChartData = exportByWorkStatus
      const exportOutOfSchoolChartData = getTopItems(exportOutOfSchoolReasons, CATEGORY_LIMIT)
      const exportLearningChartData = exportLearningPathways
      const exportCivicChartData = exportCivicEngagement

      const hasSelectedContent =
        ((exportConfig.sections.summaryCards || exportConfig.sections.executiveSummary) &&
          (exportSummary.totalRegisteredUsers > 0 ||
            exportSummary.verifiedUsers > 0 ||
            exportSummary.pendingVerifications > 0 ||
            exportSummary.activeMerchants > 0)) ||
        (exportConfig.sections.monthlyTrend && exportMonthlySummary.length > 0) ||
        (exportConfig.sections.ageGroup && exportAgeChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.barangay && exportBarangayChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.gender && exportGenderChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.education && exportEducationChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.workStatus && exportWorkChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.outOfSchool &&
          exportOutOfSchoolChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.learning && exportLearningChartData.some((item) => item.value > 0)) ||
        (exportConfig.sections.civic && exportCivicChartData.some((item) => item.value > 0))

      if (!hasSelectedContent) {
        setExportError(
          'No report data matched the filters and sections you selected. Try widening the date range or choosing different analytics.'
        )
        return
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      }) as PdfDoc

      const generatedAt = new Date().toLocaleString('en-PH')
      const filterSummary = buildFilterSummary(exportConfig.filters)
      let cursorY = 42

      drawPdfHeader(doc, {
        title: 'KK Profiling Analytics Report',
        subtitle: 'Superadmin reporting export for official barangay monitoring and presentation.',
        generatedAt,
      })
      cursorY = 138

      if (exportConfig.sections.summaryCards) {
        cursorY = drawPdfSummaryCards(
          doc,
          [
            {
              label: 'Total registered youth',
              value: exportSummary.totalRegisteredUsers.toLocaleString(),
              tone: REPORT_COLORS[0],
            },
            {
              label: 'Verified youth',
              value: exportSummary.verifiedUsers.toLocaleString(),
              tone: REPORT_COLORS[3],
            },
            {
              label: 'Pending verifications',
              value: exportSummary.pendingVerifications.toLocaleString(),
              tone: REPORT_COLORS[4],
            },
            {
              label: 'Active merchants',
              value: exportSummary.activeMerchants.toLocaleString(),
              tone: REPORT_COLORS[1],
            },
            {
              label: 'Monthly growth',
              value: formatSignedPercent(exportSummary.monthlyGrowthPercent),
              tone: REPORT_COLORS[5],
            },
            {
              label: 'Survey completion',
              value: `${exportSummary.surveyCompletionRate}%`,
              tone: REPORT_COLORS[2],
            },
          ],
          cursorY
        )
      }

      if (exportConfig.sections.executiveSummary) {
        cursorY = drawPdfNarrative(
          doc,
          'Executive summary',
          `This report summarizes live KK profiling, verification, and engagement data for youth members in the system. The current verification rate stands at ${exportSummary.verificationRate}% with ${exportSummary.currentMonthRegistered} new profile submissions and ${exportSummary.currentMonthVerified} successful verifications in ${exportSummary.currentMonthLabel}. Applied filters: ${filterSummary}.`,
          cursorY
        )
      }

      if (exportConfig.sections.monthlyTrend && exportMonthlySummary.length > 0) {
        cursorY = drawPdfMonthlyTrendSection(
          doc,
          exportMonthlySummary,
          cursorY,
          includeTables,
          showVisualCharts
        )
      }

      if (exportConfig.sections.ageGroup && exportByAgeGroup.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Demographics by age group',
          description: 'Shows which youth age bands are most represented in the registry.',
          chartItems: exportAgeChartData,
          tableItems: exportByAgeGroup,
          startY: cursorY,
          variant: 'columns',
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.barangay && exportByBarangay.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Top barangays by registered youth',
          description: 'Highlights the barangays with the strongest concentration of registered youth in the filtered dataset.',
          chartItems: exportBarangayChartData,
          tableItems: exportByBarangay,
          startY: cursorY,
          variant: 'rankedBars',
          colorOffset: 1,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.gender && exportByGender.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Reported gender mix',
          description: 'Breaks down reported member gender from the saved KK profiling submissions.',
          chartItems: exportGenderChartData,
          tableItems: exportByGender,
          startY: cursorY,
          variant: 'donut',
          colorOffset: 2,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.education && exportByEducation.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Educational background',
          description: 'Highlights the strongest educational segments represented in live profiles.',
          chartItems: exportEducationChartData,
          tableItems: exportByEducation,
          startY: cursorY,
          variant: 'lollipop',
          colorOffset: 3,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.workStatus && exportByWorkStatus.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Employment status',
          description: 'Summarizes which youth members are employed, unemployed, or actively looking for work.',
          chartItems: exportWorkChartData,
          tableItems: exportByWorkStatus,
          startY: cursorY,
          variant: 'stackedBar',
          colorOffset: 4,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (
        exportConfig.sections.outOfSchool &&
        exportOutOfSchoolReasons.some((item) => item.value > 0)
      ) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Out-of-school youth reasons',
          description: 'Breaks down the top reasons reported by youth members who are not currently enrolled.',
          chartItems: exportOutOfSchoolChartData,
          tableItems: exportOutOfSchoolReasons,
          startY: cursorY,
          variant: 'stepBars',
          colorOffset: 5,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.learning && exportLearningPathways.some((item) => item.value > 0)) {
        cursorY = drawPdfDistributionSection(doc, {
          title: 'Skills, training, and livelihood pathways',
          description: 'Captures scholarship support, track orientation, vocational signals, and business interest.',
          chartItems: exportLearningChartData,
          tableItems: exportLearningPathways,
          startY: cursorY,
          variant: 'bubbleCluster',
          colorOffset: 6,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      if (exportConfig.sections.civic && exportCivicEngagement.some((item) => item.value > 0)) {
        drawPdfDistributionSection(doc, {
          title: 'Barangay engagement insights',
          description: 'Summarizes civic and barangay participation signals from the KK profiling questionnaire.',
          chartItems: exportCivicChartData,
          tableItems: exportCivicEngagement,
          startY: cursorY,
          variant: 'dotGrid',
          colorOffset: 7,
          showTable: includeTables,
          showChart: showVisualCharts,
        })
      }

      doc.save(`kk-profiling-report-${new Date().toISOString().slice(0, 10)}.pdf`)
      setIsReportBuilderOpen(false)
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Failed to build the PDF report with the selected filters.'
      )
    } finally {
      setIsExporting(false)
    }
  }

  const hasAnyExportSectionSelected = hasEnabledExportSection(exportConfig.sections)

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <AdminSurface>
          <div className="h-28 animate-pulse rounded-3xl" style={{ background: 'var(--surface-muted)' }} />
        </AdminSurface>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
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
        title="Turn KK profiling answers into cleaner, more actionable barangay reporting."
        description="This workspace keeps the reporting story focused on the real leadership questions: who is in the registry, which youth segments need support, how verification is moving, and what the current profiling answers say about demographics, education, work, and engagement."
        pills={[
          <DashboardPill key="live" tone="soft">
            Live backend data
          </DashboardPill>,
          <DashboardPill key="profiling" tone="default">
            KK profiling insights
          </DashboardPill>,
          <DashboardPill key="export" tone="success">
            Printable PDF export
          </DashboardPill>,
        ]}
        aside={
          <div className="grid grid-cols-2 gap-3">
            <DashboardMiniStat
              label={summary.currentMonthLabel}
              value={summary.currentMonthRegistered.toLocaleString()}
              meta="Registrations in the latest reporting month"
              tone="soft"
            />
            <DashboardMiniStat
              label="Verification rate"
              value={`${summary.verificationRate}%`}
              meta="Profiles currently marked as verified"
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
              description="As soon as the registry has enough live member data, the charts, cards, and report exports will populate here."
            />
          </div>
        </AdminSurface>
      ) : null}

      {!error && hasChartData ? (
        <>
          <AdminSurface tone="soft">
            <AdminSurfaceHeader
              title="Report tools"
              description="Refresh live analytics, narrow the reporting scope with filters, and generate official PDF exports for meetings and documentation."
              action={
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void loadReports()}
                    disabled={isLoading || isExporting}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card)',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    <RefreshCw size={16} />
                    Refresh data
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={isLoading || isExporting}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card)',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    <RotateCcw size={16} />
                    Reset filters
                  </button>
                  <button
                    type="button"
                    onClick={openReportBuilder}
                    disabled={isLoading || isExporting}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Download size={16} />
                    Build PDF report
                  </button>
                </div>
              }
            />
            <div className="mt-5">
              <AdminFilterBar columns="xl:grid-cols-6">
                <AdminField label="Date From">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                    }}
                  />
                </AdminField>
                <AdminField label="Date To">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card)',
                      color: 'var(--ink)',
                    }}
                  />
                </AdminField>
                <AdminField label="Barangay">
                  <ReportSelect
                    value={filters.barangay}
                    onChange={(value) => setFilters((current) => ({ ...current, barangay: value }))}
                    options={['all', ...filterOptions.barangays]}
                  />
                </AdminField>
                <AdminField label="Age Group">
                  <ReportSelect
                    value={filters.ageGroup}
                    onChange={(value) => setFilters((current) => ({ ...current, ageGroup: value }))}
                    options={['all', ...filterOptions.ageGroups]}
                  />
                </AdminField>
                <AdminField label="Gender">
                  <ReportSelect
                    value={filters.gender}
                    onChange={(value) => setFilters((current) => ({ ...current, gender: value }))}
                    options={['all', ...filterOptions.genders]}
                  />
                </AdminField>
                <AdminField label="Verification Status">
                  <ReportSelect
                    value={filters.status}
                    onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                    options={['all', ...filterOptions.statuses]}
                  />
                </AdminField>
              </AdminFilterBar>
            </div>
          </AdminSurface>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ReportKpiCard
              label="Total registered youth"
              value={summary.totalRegisteredUsers.toLocaleString()}
              meta="Youth members represented in the current filtered reporting scope."
              icon={<Users size={18} />}
              accent={REPORT_COLORS[0]}
            />
            <ReportKpiCard
              label="Verified youth"
              value={summary.verifiedUsers.toLocaleString()}
              meta="Members who have already completed the verification requirement."
              icon={<BadgeCheck size={18} />}
              accent={REPORT_COLORS[3]}
              trendLabel={`${summary.verificationRate}% verified`}
              trendTone="positive"
            />
            <ReportKpiCard
              label="Pending verifications"
              value={summary.pendingVerifications.toLocaleString()}
              meta="Members still waiting for document review or other verification steps."
              icon={<FileClock size={18} />}
              accent={REPORT_COLORS[4]}
            />
            <ReportKpiCard
              label="Active merchants"
              value={summary.activeMerchants.toLocaleString()}
              meta="Approved merchant partners currently active in the ecosystem."
              icon={<Store size={18} />}
              accent={REPORT_COLORS[1]}
            />
            <ReportKpiCard
              label="Monthly growth"
              value={formatSignedPercent(summary.monthlyGrowthPercent)}
              meta={`Compared with the previous registration month before ${summary.currentMonthLabel}.`}
              icon={<TrendingUp size={18} />}
              accent={REPORT_COLORS[5]}
              trendLabel={summary.monthlyGrowthPercent >= 0 ? 'Growth' : 'Decline'}
              trendTone={summary.monthlyGrowthPercent >= 0 ? 'positive' : 'warning'}
            />
            <ReportKpiCard
              label="Survey completion rate"
              value={`${summary.surveyCompletionRate}%`}
              meta="Profiles with completed KK questionnaire submissions in the filtered scope."
              icon={<ClipboardList size={18} />}
              accent={REPORT_COLORS[2]}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.24fr,0.76fr]">
            <ChartPanel
              title="Registration and verification trend"
              description="A modern view of how the registry is growing over time, with verified profiles layered into the same timeline."
            >
              {monthlySummary.length > 0 ? (
                <ChartContainer config={MONTHLY_CONFIG} className="min-h-[350px] w-full">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart accessibilityLayer data={monthlySummary} margin={{ left: 8, right: 8 }}>
                      <defs>
                        <linearGradient id="registeredGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MONTHLY_CONFIG.registered.color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={MONTHLY_CONFIG.registered.color} stopOpacity={0.04} />
                        </linearGradient>
                        <linearGradient id="verifiedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MONTHLY_CONFIG.verified.color} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={MONTHLY_CONFIG.verified.color} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(100, 116, 139, 0.24)" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} width={36} />
                      <ChartTooltip
                        cursor={{ stroke: 'rgba(37, 99, 235, 0.22)', strokeWidth: 1 }}
                        content={<ChartTooltipContent />}
                      />
                      <Legend content={<ChartLegendContent />} />
                      <Area
                        type="monotone"
                        dataKey="registered"
                        stroke={MONTHLY_CONFIG.registered.color}
                        fill="url(#registeredGradient)"
                        strokeWidth={2.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="verified"
                        stroke={MONTHLY_CONFIG.verified.color}
                        fill="url(#verifiedGradient)"
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <ChartPanelEmpty />
              )}
            </ChartPanel>

            <AdminSurface>
              <AdminSurfaceHeader
                title="Verification and completion snapshot"
                description="Keeps progress, status mix, and recent reporting volume visible beside the main trend chart."
              />
              <div className="mt-5 grid gap-5">
                <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--card)' }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                        Verification progress
                      </p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
                        Share of the filtered registry already marked as verified.
                      </p>
                    </div>
                    <DashboardPill tone="soft">{summary.verificationRate}%</DashboardPill>
                  </div>
                  <ChartContainer className="min-h-[220px] w-full">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadialBarChart
                        innerRadius="64%"
                        outerRadius="100%"
                        barSize={18}
                        data={[
                          {
                            name: 'Verification rate',
                            value: summary.verificationRate,
                            fill: REPORT_COLORS[3],
                          },
                        ]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={18} />
                        <text
                          x="50%"
                          y="46%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fill: 'var(--ink)', fontSize: 32, fontWeight: 700 }}
                        >
                          {summary.verificationRate}%
                        </text>
                        <text
                          x="50%"
                          y="60%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fill: 'var(--muted)', fontSize: 12 }}
                        >
                          Verified
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                <DashboardStatusList
                  items={[
                    {
                      label: 'Verified profiles',
                      value: summary.verifiedUsers.toLocaleString(),
                      meta: 'Members currently cleared in the verification workflow.',
                      tone: 'success',
                      progress: summary.verificationRate,
                    },
                    {
                      label: 'Pending verifications',
                      value: summary.pendingVerifications.toLocaleString(),
                      meta: 'Members still moving through review or missing steps.',
                      tone: 'warning',
                    },
                    {
                      label: `${summary.currentMonthLabel} registrations`,
                      value: summary.currentMonthRegistered.toLocaleString(),
                      meta: 'New KK questionnaire submissions in the latest reporting month.',
                      tone: 'info',
                    },
                    {
                      label: `${summary.currentMonthLabel} verifications`,
                      value: summary.currentMonthVerified.toLocaleString(),
                      meta: 'Profiles that reached verified status in the same month.',
                      tone: 'default',
                    },
                  ]}
                />
              </div>
            </AdminSurface>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <VerticalBarPanel
              title="Youth by age group"
              description="Compares the age bands represented in the filtered registry."
              data={ageChartData}
              insight={insights.topAgeGroup}
              xAxisHeight={56}
            />

            <VerticalBarPanel
              title="Top barangays with most registered youth"
              description="Surfaces the barangays contributing the largest share of registered youth members."
              data={barangayChartData}
              insight={insights.topBarangay}
              xAxisHeight={70}
              colorOffset={1}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <DonutPanel
              title="Reported gender distribution"
              description="Uses a single clean donut to show the current demographic split without duplicating the same proportion elsewhere."
              data={genderChartData}
              config={genderConfig}
              insight={insights.topGender}
            />

            <HorizontalBarPanel
              title="Educational background"
              description="Highlights the strongest educational segments in the current filtered dataset."
              data={educationChartData}
              insight={insights.topEducation}
              yAxisWidth={150}
              colorOffset={2}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <HorizontalBarPanel
              title="Employment status"
              description="Shows how many youth members are employed, unemployed, or actively looking for work."
              data={workChartData}
              insight={insights.topWorkStatus}
              yAxisWidth={122}
              colorOffset={3}
            />

            <HorizontalBarPanel
              title="Out-of-school youth reasons"
              description="Makes it easier to see which barriers are most commonly keeping youth members out of school."
              data={outOfSchoolChartData}
              insight={insights.topOutOfSchoolReason}
              yAxisWidth={170}
              colorOffset={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <HorizontalBarPanel
              title="Skills and training interests"
              description="Summarizes scholarship support, academic/vocational signals, and business interest from the KK profiling responses."
              data={learningChartData}
              insight={insights.topPathway}
              yAxisWidth={164}
              colorOffset={5}
            />

            <HorizontalBarPanel
              title="Barangay engagement insights"
              description="Shows the strongest participation signals from the profiling answers, including voting, KK assembly attendance, and volunteer involvement."
              data={civicChartData}
              insight={insights.topCivicSignal}
              yAxisWidth={178}
              colorOffset={6}
            />
          </div>
        </>
      ) : null}

      <ReportBuilderModal
        open={isReportBuilderOpen}
        filters={exportConfig.filters}
        options={filterOptions}
        sections={exportConfig.sections}
        includeBreakdownTables={exportConfig.includeBreakdownTables}
        reportFormat={exportConfig.reportFormat}
        error={exportError}
        isExporting={isExporting}
        canGenerate={hasAnyExportSectionSelected}
        onClose={closeReportBuilder}
        onGenerate={() => void generatePdfReport()}
        onUseDashboardFilters={() =>
          setExportConfig((current) => ({
            ...current,
            filters: { ...filters },
          }))
        }
        onResetSelections={() => setExportConfig(createExportConfig(exportConfig.filters))}
        onSelectAllSections={() =>
          setExportConfig((current) => ({
            ...current,
            sections: { ...DEFAULT_EXPORT_SECTIONS },
          }))
        }
        onFilterChange={(key, value) =>
          setExportConfig((current) => ({
            ...current,
            filters: {
              ...current.filters,
              [key]: value,
            },
          }))
        }
        onSectionToggle={(key) =>
          setExportConfig((current) => ({
            ...current,
            sections: {
              ...current.sections,
              [key]: !current.sections[key],
            },
          }))
        }
        onBreakdownToggle={() =>
          setExportConfig((current) => ({
            ...current,
            includeBreakdownTables: !current.includeBreakdownTables,
          }))
        }
        onFormatChange={(value) =>
          setExportConfig((current) => ({
            ...current,
            reportFormat: value,
          }))
        }
      />
    </div>
  )
}

function ReportSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
      style={{
        borderColor: 'var(--stroke)',
        background: 'var(--card)',
        color: 'var(--ink)',
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === 'all' ? 'All' : option}
        </option>
      ))}
    </select>
  )
}

function ReportKpiCard({
  label,
  value,
  meta,
  icon,
  accent,
  trendLabel,
  trendTone = 'default',
}: {
  label: string
  value: string
  meta: string
  icon: ReactNode
  accent: string
  trendLabel?: string
  trendTone?: 'default' | 'positive' | 'warning'
}) {
  const toneStyles =
    trendTone === 'positive'
      ? { background: 'var(--success-bg)', color: 'var(--success-fg)' }
      : trendTone === 'warning'
        ? { background: 'var(--warning-bg)', color: 'var(--warning-fg)' }
        : { background: 'var(--surface-muted)', color: 'var(--muted)' }

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)]"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--stroke)',
      }}
    >
      <div
        className="mb-4 h-1.5 w-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 74%)` }}
      />
      <div className="flex items-start justify-between gap-4">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, var(--card-solid) 84%)`,
            color: accent,
          }}
        >
          {icon}
        </div>
        {trendLabel ? (
          <span
            className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={toneStyles}
          >
            {trendLabel}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
        {meta}
      </p>
    </section>
  )
}

function ReportBuilderModal({
  open,
  filters,
  options,
  sections,
  includeBreakdownTables,
  reportFormat,
  error,
  isExporting,
  canGenerate,
  onClose,
  onGenerate,
  onUseDashboardFilters,
  onResetSelections,
  onSelectAllSections,
  onFilterChange,
  onSectionToggle,
  onBreakdownToggle,
  onFormatChange,
}: {
  open: boolean
  filters: FilterState
  options: ReportFiltersPayload['options']
  sections: ExportSectionState
  includeBreakdownTables: boolean
  reportFormat: 'visual' | 'tabular'
  error: string | null
  isExporting: boolean
  canGenerate: boolean
  onClose: () => void
  onGenerate: () => void
  onUseDashboardFilters: () => void
  onResetSelections: () => void
  onSelectAllSections: () => void
  onFilterChange: (key: keyof FilterState, value: string) => void
  onSectionToggle: (key: ExportSectionKey) => void
  onBreakdownToggle: () => void
  onFormatChange: (value: 'visual' | 'tabular') => void
}) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 backdrop-blur-md"
      style={{
        background:
          'linear-gradient(180deg, rgba(1, 67, 132, 0.16), rgba(1, 67, 132, 0.12)), rgba(4, 26, 51, 0.42)',
      }}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border shadow-[var(--shadow-lg)]"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent) 14%, var(--card-solid) 86%)',
          background: 'var(--card-solid)',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-6 py-5 sm:px-8"
          style={{ borderColor: 'var(--stroke)', background: 'color-mix(in srgb, var(--accent-soft) 12%, var(--card-solid) 88%)' }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
              PDF report builder
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
              Choose the filters and sections for this report
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
              Configure the reporting scope before downloading. You can narrow the date range, target a
              specific demographic slice, and include only the analytics sections needed for meetings,
              presentations, or official barangay documentation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
            style={{
              borderColor: 'var(--stroke)',
              background: 'var(--card)',
              color: 'var(--ink-soft)',
            }}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-5 xl:grid-cols-[1.05fr,0.95fr]">
            <AdminSurface tone="soft">
              <AdminSurfaceHeader
                title="Report scope"
                description="Choose which member records should feed into the PDF. These filters apply only to the export unless you intentionally mirror the dashboard filters."
                action={
                  <button
                    type="button"
                    onClick={onUseDashboardFilters}
                    disabled={isExporting}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{
                      borderColor: 'var(--stroke)',
                      background: 'var(--card)',
                      color: 'var(--ink-soft)',
                    }}
                  >
                    Use dashboard filters
                  </button>
                }
              />
              <div className="mt-5">
                <AdminFilterBar columns="xl:grid-cols-2">
                  <AdminField label="Date From">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) => onFilterChange('dateFrom', event.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                      }}
                    />
                  </AdminField>
                  <AdminField label="Date To">
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) => onFilterChange('dateTo', event.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                      }}
                    />
                  </AdminField>
                  <AdminField label="Barangay">
                    <ReportSelect
                      value={filters.barangay}
                      onChange={(value) => onFilterChange('barangay', value)}
                      options={['all', ...options.barangays]}
                    />
                  </AdminField>
                  <AdminField label="Age Group">
                    <ReportSelect
                      value={filters.ageGroup}
                      onChange={(value) => onFilterChange('ageGroup', value)}
                      options={['all', ...options.ageGroups]}
                    />
                  </AdminField>
                  <AdminField label="Gender">
                    <ReportSelect
                      value={filters.gender}
                      onChange={(value) => onFilterChange('gender', value)}
                      options={['all', ...options.genders]}
                    />
                  </AdminField>
                  <AdminField label="Verification Status">
                    <ReportSelect
                      value={filters.status}
                      onChange={(value) => onFilterChange('status', value)}
                      options={['all', ...options.statuses]}
                    />
                  </AdminField>
                </AdminFilterBar>
              </div>
            </AdminSurface>

            <AdminSurface>
              <AdminSurfaceHeader
                title="Summary and analytics sections"
                description="Include only the sections you want in the report. This keeps exports shorter, clearer, and better aligned with the meeting or presentation context."
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onSelectAllSections}
                      disabled={isExporting}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: 'var(--card)',
                        color: 'var(--ink-soft)',
                      }}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={onResetSelections}
                      disabled={isExporting}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-60"
                      style={{
                        borderColor: 'var(--stroke)',
                        background: 'var(--card)',
                        color: 'var(--ink-soft)',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                }
              />

              <div className="mt-5 grid gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                    Summary sections
                  </p>
                  <div className="mt-3 grid gap-3">
                    {SUMMARY_EXPORT_OPTIONS.map((item) => (
                      <ReportBuilderToggle
                        key={item.key}
                        checked={sections[item.key]}
                        label={item.label}
                        description={item.description}
                        onChange={() => onSectionToggle(item.key)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                    KK profiling analytics
                  </p>
                  <div className="mt-3 grid gap-3">
                    {ANALYTICS_EXPORT_OPTIONS.map((item) => (
                      <ReportBuilderToggle
                        key={item.key}
                        checked={sections[item.key]}
                        label={item.label}
                        description={item.description}
                        onChange={() => onSectionToggle(item.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </AdminSurface>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
            <AdminSurface tone="soft">
              <AdminSurfaceHeader
                title="Export options"
                description="Choose whether the PDF should stay visual with charts or shift into a cleaner text-and-table format for easier documentation and printing."
              />
              <div className="mt-5 grid gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted)' }}>
                    Report format
                  </p>
                  <div className="mt-3 grid gap-3">
                    <ReportBuilderFormatOption
                      selected={reportFormat === 'visual'}
                      title="Visual analytics PDF"
                      description="Keeps the charts and graphs in the report for easier visual storytelling during meetings and presentations."
                      onClick={() => onFormatChange('visual')}
                    />
                    <ReportBuilderFormatOption
                      selected={reportFormat === 'tabular'}
                      title="Plain text / tabular PDF"
                      description="Removes charts and outputs a cleaner text-and-table report that is easier to print, archive, and use as formal documentation."
                      onClick={() => onFormatChange('tabular')}
                    />
                  </div>
                </div>

                <ReportBuilderToggle
                  checked={includeBreakdownTables}
                  disabled={reportFormat === 'tabular'}
                  label="Include answer breakdown tables"
                  description={
                    reportFormat === 'tabular'
                      ? 'Tables are always included in plain text/tabular mode so each selected section still shows the underlying counts.'
                      : 'Adds count tables under each selected analytics section so the PDF is more detailed and presentation-ready.'
                  }
                  onChange={onBreakdownToggle}
                />
              </div>
            </AdminSurface>

            <AdminSurface>
              <AdminSurfaceHeader
                title="Before you generate"
                description="Review the setup before downloading. The PDF will use the filter set and analytics toggles selected above."
              />
              <div className="mt-5 grid gap-4 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                <div
                  className="rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: 'var(--stroke)',
                    background: 'color-mix(in srgb, var(--surface-muted) 72%, transparent)',
                  }}
                >
                  <p className="font-semibold" style={{ color: 'var(--ink-soft)' }}>
                    Selected sections
                  </p>
                  <p className="mt-2">
                    {Object.values(sections).filter(Boolean).length} sections will be included in the export.
                  </p>
                  <p className="mt-2">
                    Format:{' '}
                    <span className="font-semibold" style={{ color: 'var(--ink-soft)' }}>
                      {reportFormat === 'visual' ? 'Visual analytics PDF' : 'Plain text / tabular PDF'}
                    </span>
                  </p>
                </div>

                {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
              </div>
            </AdminSurface>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          style={{ borderColor: 'var(--stroke)', background: 'color-mix(in srgb, var(--surface-muted) 56%, transparent)' }}
        >
          <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
            The report will download only after you confirm this builder.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              style={{
                borderColor: 'var(--stroke)',
                background: 'var(--card)',
                color: 'var(--ink-soft)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isExporting || !canGenerate}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
            >
              {isExporting ? 'Generating PDF...' : 'Generate and download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportBuilderToggle({
  checked,
  label,
  description,
  disabled = false,
  onChange,
}: {
  checked: boolean
  label: string
  description: string
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <label
      className="flex gap-3 rounded-2xl border px-4 py-3 transition-colors"
      style={{
        borderColor: checked ? 'color-mix(in srgb, var(--accent) 30%, var(--stroke) 70%)' : 'var(--stroke)',
        background: checked
          ? 'color-mix(in srgb, var(--accent-soft) 18%, var(--card-solid) 82%)'
          : 'var(--card)',
        opacity: disabled ? 0.72 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border"
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="block">
        <span className="block text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
          {label}
        </span>
        <span className="mt-1 block text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {description}
        </span>
      </span>
    </label>
  )
}

function ReportBuilderFormatOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border px-4 py-4 text-left transition-colors"
      style={{
        borderColor: selected
          ? 'color-mix(in srgb, var(--accent) 32%, var(--stroke) 68%)'
          : 'var(--stroke)',
        background: selected
          ? 'color-mix(in srgb, var(--accent-soft) 18%, var(--card-solid) 82%)'
          : 'var(--card)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
            {title}
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
        <span
          className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
          style={{
            borderColor: selected ? 'var(--accent)' : 'var(--stroke)',
            background: selected ? 'var(--accent)' : 'transparent',
            color: selected ? '#fff' : 'var(--muted)',
          }}
        >
          {selected ? '✓' : ''}
        </span>
      </div>
    </button>
  )
}

function VerticalBarPanel({
  title,
  description,
  data,
  insight,
  xAxisHeight = 56,
  colorOffset = 0,
}: {
  title: string
  description: string
  data: ReportDatum[]
  insight?: string
  xAxisHeight?: number
  colorOffset?: number
}) {
  if (data.length === 0) {
    return (
      <ChartPanel title={title} description={description} insight={insight}>
        <ChartPanelEmpty />
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title={title} description={description} insight={insight}>
      <ChartContainer config={BAR_CONFIG} className="min-h-[320px] w-full">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(100, 116, 139, 0.24)" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
              angle={-12}
              textAnchor="end"
              height={xAxisHeight}
            />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel valueFormatter={(value) => `${value} members`} />}
            />
            <Bar dataKey="value" radius={[12, 12, 0, 0]}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={getPaletteColor(index + colorOffset)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartPanel>
  )
}

function HorizontalBarPanel({
  title,
  description,
  data,
  insight,
  yAxisWidth,
  colorOffset = 0,
}: {
  title: string
  description: string
  data: ReportDatum[]
  insight?: string
  yAxisWidth: number
  colorOffset?: number
}) {
  if (data.length === 0) {
    return (
      <ChartPanel title={title} description={description} insight={insight}>
        <ChartPanelEmpty />
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title={title} description={description} insight={insight}>
      <ChartContainer config={BAR_CONFIG} className="min-h-[340px] w-full">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 24, right: 8 }}>
            <CartesianGrid horizontal strokeDasharray="4 4" stroke="rgba(100, 116, 139, 0.24)" />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={yAxisWidth}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel valueFormatter={(value) => `${value} members`} />}
            />
            <Bar dataKey="value" radius={[0, 12, 12, 0]}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={getPaletteColor(index + colorOffset)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartPanel>
  )
}

function DonutPanel({
  title,
  description,
  data,
  config,
  insight,
}: {
  title: string
  description: string
  data: ReportDatum[]
  config: ChartConfig
  insight?: string
}) {
  if (data.length === 0) {
    return (
      <ChartPanel title={title} description={description} insight={insight}>
        <ChartPanelEmpty />
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title={title} description={description} insight={insight}>
      <ChartContainer config={config} className="min-h-[340px] w-full">
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent valueFormatter={(value) => `${value} members`} />}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={78} outerRadius={108} paddingAngle={4}>
              {data.map((item, index) => (
                <Cell key={item.name} fill={config[item.name]?.color || getPaletteColor(index)} />
              ))}
            </Pie>
            <Legend content={<ChartLegendContent className="justify-center" />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartPanel>
  )
}

function ChartPanelEmpty() {
  return (
    <div
      className="rounded-2xl border border-dashed px-6 py-12 text-center"
      style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>
        No chart data for this filter set
      </p>
      <p className="mt-2 text-sm leading-6">
        Try widening the date range or clearing one of the report filters.
      </p>
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
  children: ReactNode
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

function buildLeadingInsight(data: ReportDatum[], suffix: string) {
  const top = getTopReportDatum(data)
  return top ? `${top.name} ${suffix}` : 'No chart data yet.'
}

function buildConfigFromData(data: ReportDatum[], customColors?: Record<string, string>) {
  return data.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: customColors?.[item.name.toLowerCase()] || getPaletteColor(index),
    }
    return config
  }, {} as ChartConfig)
}

function getTopItems(data: ReportDatum[], limit: number) {
  return [...data].filter((item) => item.value > 0).slice(0, limit)
}

function getTopReportDatum(data: ReportDatum[]) {
  return [...data].filter((item) => item.value > 0).sort((a, b) => b.value - a.value)[0]
}

function getPaletteColor(index: number) {
  return REPORT_COLORS[index % REPORT_COLORS.length]
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value}%`
}

function buildFilterSummary(filters: FilterState) {
  const summary = [
    filters.dateFrom ? `from ${filters.dateFrom}` : '',
    filters.dateTo ? `to ${filters.dateTo}` : '',
    filters.barangay !== 'all' ? `barangay: ${filters.barangay}` : '',
    filters.ageGroup !== 'all' ? `age group: ${filters.ageGroup}` : '',
    filters.gender !== 'all' ? `gender: ${filters.gender}` : '',
    filters.status !== 'all' ? `status: ${filters.status}` : '',
  ].filter(Boolean)

  return summary.length > 0 ? summary.join(', ') : 'No filters applied'
}

function drawPdfHeader(
  doc: PdfDoc,
  {
    title,
    subtitle,
    generatedAt,
  }: {
    title: string
    subtitle: string
    generatedAt: string
  }
) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 86, 'F')
  doc.setFillColor(245, 158, 11)
  doc.rect(0, 86, pageWidth, 6, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(title, 40, 44)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(subtitle, 40, 62)
  doc.text(`Generated: ${generatedAt}`, 40, 78)
}

function drawPdfSummaryCards(
  doc: PdfDoc,
  items: Array<{ label: string; value: string; tone: string }>,
  startY: number
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const gap = 14
  const startX = 40
  const cardWidth = (pageWidth - startX * 2 - gap * 2) / 3
  const cardHeight = 74
  const columns = 3

  items.forEach((item, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const x = startX + column * (cardWidth + gap)
    const y = startY + row * (cardHeight + gap)
    const color = hexToRgb(item.tone)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(216, 224, 234)
    doc.roundedRect(x, y, cardWidth, cardHeight, 12, 12, 'FD')
    doc.setFillColor(color.r, color.g, color.b)
    doc.roundedRect(x, y, cardWidth, 6, 12, 12, 'F')
    doc.setTextColor(73, 97, 127)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(item.label.toUpperCase(), x + 14, y + 25)
    doc.setTextColor(19, 34, 56)
    doc.setFontSize(22)
    doc.text(item.value, x + 14, y + 55)
  })

  const rows = Math.ceil(items.length / columns)
  return startY + rows * cardHeight + (rows - 1) * gap + 30
}

function drawPdfNarrative(doc: PdfDoc, title: string, body: string, startY: number) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const wrapped = doc.splitTextToSize(body, pageWidth - 112)
  const boxHeight = Math.max(86, 58 + wrapped.length * 11)
  const y = ensurePdfPageSpace(doc, startY, boxHeight + 8)

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(216, 224, 234)
  doc.roundedRect(40, y, pageWidth - 80, boxHeight, 14, 14, 'FD')
  doc.setTextColor(19, 34, 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, 56, y + 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(wrapped, 56, y + 44)

  return y + boxHeight + 30
}

function drawPdfMonthlyTrendSection(
  doc: PdfDoc,
  data: MonthlySummaryDatum[],
  startY: number,
  showTable = true,
  showChart = true
) {
  const chartData = data.slice(-6)
  let y = ensurePdfPageSpace(doc, startY, showChart ? 312 : 176)

  doc.setTextColor(19, 34, 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Registration and verification trend', 40, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(73, 97, 127)
  doc.text(
    'Month-by-month view of new profile submissions and profiles that reached verified status.',
    40,
    y + 16
  )
  y += 40

  if (!showChart) {
    if (showTable) {
      autoTable(doc, {
        startY: y,
        margin: { left: 40, right: 40 },
        head: [['Month', 'Registered', 'Verified']],
        body: chartData.map((item) => [item.month, String(item.registered), String(item.verified)]),
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 6,
          textColor: [19, 34, 56],
          lineColor: [216, 224, 234],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      })

      return getAutoTableFinalY(doc, y) + 30
    }

    return y + 20
  }

  const trendChart = buildPdfMonthlyTrendChartImage(chartData)
  doc.addImage(trendChart.dataUrl, 'PNG', 40, y, trendChart.width, trendChart.height)
  const chartBottomWithLabels = y + trendChart.height

  if (showTable) {
    autoTable(doc, {
      startY: chartBottomWithLabels + 14,
      margin: { left: 40, right: 40 },
      head: [['Month', 'Registered', 'Verified']],
      body: chartData.map((item) => [item.month, String(item.registered), String(item.verified)]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: [19, 34, 56],
        lineColor: [216, 224, 234],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    return getAutoTableFinalY(doc, chartBottomWithLabels) + 30
  }

  return chartBottomWithLabels + 30
}

function drawPdfDistributionSection(
  doc: PdfDoc,
  {
    title,
    description,
    chartItems,
    tableItems,
    startY,
    variant,
    colorOffset = 0,
    showTable = true,
    showChart = true,
  }: {
    title: string
    description: string
    chartItems: ReportDatum[]
    tableItems: ReportDatum[]
    startY: number
    variant: PdfChartVariant
    colorOffset?: number
    showTable?: boolean
    showChart?: boolean
  }
) {
  const filteredChartItems = chartItems.filter((item) => item.value > 0)
  const filteredTableItems = tableItems.filter((item) => item.value > 0)
  let y = ensurePdfPageSpace(
    doc,
    startY,
    showChart ? getPdfVariantSectionHeight(variant) + 56 : 176
  )

  doc.setTextColor(19, 34, 56)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(title, 40, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(73, 97, 127)
  const wrapped = doc.splitTextToSize(description, 515)
  doc.text(wrapped, 40, y + 16)
  y += wrapped.length * 12 + 24

  if (!showChart) {
    if (showTable) {
      autoTable(doc, {
        startY: y,
        margin: { left: 40, right: 40 },
        head: [['Answer / segment', 'Count']],
        body: filteredTableItems.map((item) => [item.name, String(item.value)]),
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 6,
          textColor: [19, 34, 56],
          lineColor: [216, 224, 234],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      })

      return getAutoTableFinalY(doc, y) + 30
    }

    return y + 20
  }
  const chartVisual = buildPdfDistributionChartImage(filteredChartItems, variant, colorOffset)
  doc.addImage(chartVisual.dataUrl, 'PNG', 40, y, chartVisual.width, chartVisual.height)
  y += chartVisual.height + 14

  if (showTable) {
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [['Answer / segment', 'Count']],
      body: filteredTableItems.map((item) => [item.name, String(item.value)]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: [19, 34, 56],
        lineColor: [216, 224, 234],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    })

    return getAutoTableFinalY(doc, y) + 30
  }

  return y + 24
}

function getPdfVariantSectionHeight(variant: PdfChartVariant) {
  switch (variant) {
    case 'columns':
      return 176
    case 'rankedBars':
      return 160
    case 'donut':
      return 184
    case 'lollipop':
      return 160
    case 'stackedBar':
      return 138
    case 'stepBars':
      return 162
    case 'bubbleCluster':
      return 172
    case 'dotGrid':
      return 160
    default:
      return 160
  }
}

function buildPdfMonthlyTrendChartImage(data: MonthlySummaryDatum[]) {
  const { canvas, ctx } = createPdfChartCanvas(920, 290)
  const legendItems = [
    { label: 'Registered', color: MONTHLY_CONFIG.registered.color },
    { label: 'Verified', color: MONTHLY_CONFIG.verified.color },
  ]

  const plot = {
    x: 58,
    y: 52,
    width: 804,
    height: 150,
  }

  const maxValue = Math.max(1, ...data.flatMap((item) => [item.registered, item.verified]))
  const xStep = data.length > 1 ? plot.width / (data.length - 1) : 0
  const registeredPoints = data.map((item, index) => ({
    x: plot.x + (data.length > 1 ? index * xStep : plot.width / 2),
    y: plot.y + plot.height - (item.registered / maxValue) * (plot.height - 20),
    value: item.registered,
    label: item.month,
  }))
  const verifiedPoints = data.map((item, index) => ({
    x: plot.x + (data.length > 1 ? index * xStep : plot.width / 2),
    y: plot.y + plot.height - (item.verified / maxValue) * (plot.height - 20),
    value: item.verified,
    label: item.month,
  }))

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  ctx.lineWidth = 1
  for (let lineIndex = 0; lineIndex <= 4; lineIndex += 1) {
    const y = plot.y + (plot.height / 4) * lineIndex
    ctx.beginPath()
    ctx.moveTo(plot.x, y)
    ctx.lineTo(plot.x + plot.width, y)
    ctx.stroke()
  }

  drawCanvasLegendRow(ctx, 58, 22, legendItems)
  drawCanvasLineSeries(ctx, registeredPoints, MONTHLY_CONFIG.registered.color, {
    fill: true,
    dash: [],
    baselineY: plot.y + plot.height,
  })
  drawCanvasLineSeries(ctx, verifiedPoints, MONTHLY_CONFIG.verified.color, {
    fill: false,
    dash: [8, 6],
    baselineY: plot.y + plot.height,
  })

  ctx.fillStyle = '#49617F'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  registeredPoints.forEach((point, index) => {
    ctx.fillText(point.label, point.x, plot.y + plot.height + 28)
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 11px Arial'
    ctx.fillText(String(data[index].registered), point.x - 12, point.y - 10)
    ctx.fillText(String(data[index].verified), point.x + 12, verifiedPoints[index].y - 10)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
  })

  return finalizePdfChartCanvas(canvas, 515, 172)
}

function buildPdfDistributionChartImage(
  items: ReportDatum[],
  variant: PdfChartVariant,
  colorOffset = 0
) {
  switch (variant) {
    case 'columns':
      return buildPdfColumnsChartImage(items, colorOffset)
    case 'rankedBars':
      return buildPdfRankedBarsChartImage(items, colorOffset)
    case 'donut':
      return buildPdfDonutChartImage(items, colorOffset)
    case 'lollipop':
      return buildPdfLollipopChartImage(items, colorOffset)
    case 'stackedBar':
      return buildPdfStackedBarChartImage(items, colorOffset)
    case 'stepBars':
      return buildPdfStepBarsChartImage(items, colorOffset)
    case 'bubbleCluster':
      return buildPdfBubbleClusterChartImage(items, colorOffset)
    case 'dotGrid':
      return buildPdfDotGridChartImage(items, colorOffset)
    default:
      return buildPdfRankedBarsChartImage(items, colorOffset)
  }
}

function buildPdfColumnsChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 250)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  const plot = { x: 52, y: 22, width: 780, height: 150 }
  const columnWidth = Math.min(72, Math.max(36, plot.width / Math.max(items.length * 2, 2)))
  const gap = items.length > 1 ? (plot.width - columnWidth * items.length) / (items.length - 1) : 0

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(plot.x, plot.y + plot.height)
  ctx.lineTo(plot.x + plot.width, plot.y + plot.height)
  ctx.stroke()

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const height = Math.max(14, (item.value / maxValue) * (plot.height - 10))
    const x = plot.x + index * (columnWidth + gap)
    const y = plot.y + plot.height - height
    ctx.fillStyle = color
    drawRoundedRectOnCanvas(ctx, x, y, columnWidth, height, 16)
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(String(item.value), x + columnWidth / 2, y - 8)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
    ctx.fillText(truncateLabel(item.name, 14), x + columnWidth / 2, plot.y + plot.height + 24)
  })

  return finalizePdfChartCanvas(canvas, 515, 156)
}

function buildPdfRankedBarsChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 230)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  let y = 28

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const fillWidth = Math.max(18, (item.value / maxValue) * 470)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(36, y + 12, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), 36, y + 16)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 13px Arial'
    ctx.fillText(truncateLabel(item.name, 22), 62, y + 7)
    ctx.fillStyle = '#E7EEF7'
    drawRoundedRectOnCanvas(ctx, 62, y + 18, 470, 12, 6)
    ctx.fillStyle = color
    drawRoundedRectOnCanvas(ctx, 62, y + 18, fillWidth, 12, 6)
    ctx.fillStyle = '#49617F'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(String(item.value), 548, y + 28)
    y += 42
  })

  return finalizePdfChartCanvas(canvas, 515, 142)
}

function buildPdfDonutChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 250)
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0))
  const centerX = 190
  const centerY = 120
  const radius = 70
  let currentAngle = -Math.PI / 2

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const slice = (item.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 28
    ctx.lineCap = 'round'
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + slice)
    ctx.stroke()
    currentAngle += slice
  })

  ctx.fillStyle = '#132238'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(String(total), centerX, centerY - 2)
  ctx.fillStyle = '#49617F'
  ctx.font = '12px Arial'
  ctx.fillText('Total members', centerX, centerY + 20)

  let legendY = 56
  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const share = Math.round((item.value / total) * 100)
    ctx.fillStyle = color
    drawRoundedRectOnCanvas(ctx, 372, legendY, 16, 16, 6)
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(truncateLabel(item.name, 24), 398, legendY + 12)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
    ctx.fillText(`${item.value} members`, 398, legendY + 30)
    ctx.textAlign = 'right'
    ctx.fillStyle = color
    ctx.font = 'bold 14px Arial'
    ctx.fillText(`${share}%`, 840, legendY + 20)
    legendY += 44
  })

  return finalizePdfChartCanvas(canvas, 515, 164)
}

function buildPdfLollipopChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 230)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  let y = 34

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const xStart = 230
    const xEnd = xStart + Math.max(18, (item.value / maxValue) * 470)
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(truncateLabel(item.name, 26), 42, y + 4)

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(xStart, y)
    ctx.lineTo(730, y)
    ctx.stroke()

    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(xStart, y)
    ctx.lineTo(xEnd, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.fillStyle = color
    ctx.arc(xEnd, y, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#49617F'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(String(item.value), xEnd + 18, y + 4)
    y += 38
  })

  return finalizePdfChartCanvas(canvas, 515, 144)
}

function buildPdfStackedBarChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 190)
  const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0))
  let segmentX = 52
  const segmentY = 54
  const segmentWidth = 780
  const segmentHeight = 28

  ctx.fillStyle = '#E7EEF7'
  drawRoundedRectOnCanvas(ctx, segmentX, segmentY, segmentWidth, segmentHeight, 14)

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const width = (item.value / total) * segmentWidth
    ctx.fillStyle = color
    drawRoundedRectOnCanvas(ctx, segmentX, segmentY, width, segmentHeight, 14)
    segmentX += width
  })

  let legendX = 52
  let legendY = 110
  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const share = Math.round((item.value / total) * 100)
    ctx.fillStyle = color
    drawRoundedRectOnCanvas(ctx, legendX, legendY, 14, 14, 5)
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(truncateLabel(item.name, 18), legendX + 22, legendY + 11)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
    ctx.fillText(`${item.value} (${share}%)`, legendX + 22, legendY + 28)

    legendX += 190
    if ((index + 1) % 3 === 0) {
      legendX = 52
      legendY += 42
    }
  })

  return finalizePdfChartCanvas(canvas, 515, 122)
}

function buildPdfStepBarsChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 240)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  let y = 32

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const filledBlocks = Math.max(1, Math.round((item.value / maxValue) * 6))
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(truncateLabel(item.name, 24), 42, y + 6)

    for (let blockIndex = 0; blockIndex < 6; blockIndex += 1) {
      ctx.fillStyle = blockIndex < filledBlocks ? color : '#E7EEF7'
      drawRoundedRectOnCanvas(ctx, 310 + blockIndex * 48, y - 8, 34, 18, 6)
    }

    ctx.fillStyle = '#49617F'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(String(item.value), 620, y + 6)
    y += 38
  })

  return finalizePdfChartCanvas(canvas, 515, 146)
}

function buildPdfBubbleClusterChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 250)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  const positions = [
    { x: 180, y: 110 },
    { x: 352, y: 86 },
    { x: 520, y: 126 },
    { x: 680, y: 96 },
    { x: 280, y: 186 },
    { x: 470, y: 194 },
  ]

  items.slice(0, positions.length).forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const radius = 28 + (item.value / maxValue) * 26
    const position = positions[index]
    ctx.fillStyle = withAlpha(color, 0.16)
    ctx.beginPath()
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(String(item.value), position.x, position.y + 4)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
    ctx.fillText(truncateLabel(item.name, 20), position.x, position.y + radius + 20)
  })

  return finalizePdfChartCanvas(canvas, 515, 154)
}

function buildPdfDotGridChartImage(items: ReportDatum[], colorOffset = 0) {
  const { canvas, ctx } = createPdfChartCanvas(900, 230)
  const maxValue = Math.max(1, ...items.map((item) => item.value))
  let y = 34

  items.forEach((item, index) => {
    const color = getPaletteColor(index + colorOffset)
    const filledDots = Math.max(1, Math.round((item.value / maxValue) * 10))
    ctx.fillStyle = '#132238'
    ctx.font = 'bold 13px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(truncateLabel(item.name, 24), 42, y + 5)

    for (let dotIndex = 0; dotIndex < 10; dotIndex += 1) {
      ctx.beginPath()
      ctx.fillStyle = dotIndex < filledDots ? color : '#E7EEF7'
      ctx.arc(350 + dotIndex * 28, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#49617F'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(String(item.value), 660, y + 5)
    y += 38
  })

  return finalizePdfChartCanvas(canvas, 515, 144)
}

function createPdfChartCanvas(width: number, height: number) {
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context is not available for PDF chart rendering.')
  }

  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, width, height)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  return { canvas, ctx }
}

function finalizePdfChartCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  }
}

function drawCanvasLegendRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  items: Array<{ label: string; color: string }>
) {
  let currentX = x
  items.forEach((item) => {
    ctx.fillStyle = item.color
    drawRoundedRectOnCanvas(ctx, currentX, y, 14, 14, 5)
    ctx.fillStyle = '#49617F'
    ctx.font = '12px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(item.label, currentX + 20, y + 12)
    currentX += 88
  })
}

function drawCanvasLineSeries(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  color: string,
  options: {
    fill: boolean
    dash: number[]
    baselineY: number
  }
) {
  if (points.length === 0) {
    return
  }

  if (options.fill) {
    ctx.beginPath()
    ctx.moveTo(points[0].x, options.baselineY)
    points.forEach((point) => ctx.lineTo(point.x, point.y))
    ctx.lineTo(points[points.length - 1].x, options.baselineY)
    ctx.closePath()
    ctx.fillStyle = withAlpha(color, 0.12)
    ctx.fill()
  }

  ctx.beginPath()
  ctx.setLineDash(options.dash)
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  })
  ctx.stroke()
  ctx.setLineDash([])

  points.forEach((point) => {
    ctx.beginPath()
    ctx.fillStyle = '#FFFFFF'
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
  })
}

function drawRoundedRectOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
  ctx.fill()
}

function ensurePdfPageSpace(doc: PdfDoc, currentY: number, requiredHeight: number) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + requiredHeight <= pageHeight - 44) {
    return currentY
  }

  doc.addPage()
  return 44
}

function getAutoTableFinalY(doc: PdfDoc, fallback: number) {
  return doc.lastAutoTable?.finalY || fallback
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '')
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : sanitized

  const intValue = Number.parseInt(normalized, 16)

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  }
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
