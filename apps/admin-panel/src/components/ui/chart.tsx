'use client'

import * as React from 'react'
import {
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
  type LegendProps,
  type TooltipProps,
} from 'recharts'

import { cn } from '@/utils/cn'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('Chart components must be used inside a <ChartContainer />')
  }

  return context
}

function buildChartVars(config: ChartConfig) {
  return Object.entries(config).reduce((styles, [key, value]) => {
    if (value.color) {
      ;(styles as Record<string, string>)[`--color-${key}`] = value.color
    }

    return styles
  }, {} as React.CSSProperties)
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
  }
>(({ children, className, config, style, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          'w-full rounded-2xl [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-slate-200 [&_.recharts-legend-item-text]:text-slate-600 [&_.recharts-polar-grid_[stroke="#ccc"]]:stroke-slate-200 [&_.recharts-reference-line_[stroke="#ccc"]]:stroke-slate-200 [&_.recharts-sector:focus]:outline-none [&_.recharts-surface]:overflow-visible [&_.recharts-text]:fill-slate-500',
          className
        )}
        style={{ ...buildChartVars(config), ...style }}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = 'ChartContainer'

export const ChartTooltip = RechartsTooltip
export const ChartLegend = RechartsLegend

type PayloadItem = {
  color?: string
  dataKey?: string | number
  name?: string | number
  value?: string | number
  payload?: Record<string, unknown>
}

function resolveConfigEntry(config: ChartConfig, item: PayloadItem | undefined) {
  if (!item) return undefined

  const lookupKeys = [
    typeof item.dataKey === 'string' ? item.dataKey : undefined,
    typeof item.name === 'string' ? item.name : undefined,
  ].filter(Boolean) as string[]

  for (const key of lookupKeys) {
    if (config[key]) return { key, entry: config[key] }
  }

  return undefined
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  hideLabel = false,
  valueFormatter,
}: TooltipProps<number, string> & {
  className?: string
  hideLabel?: boolean
  valueFormatter?: (value: number | string, name: string) => React.ReactNode
}) {
  const { config } = useChart()
  const items = (payload as PayloadItem[] | undefined)?.filter((item) => item.value != null) ?? []

  if (!active || items.length === 0) return null

  return (
    <div className={cn('min-w-[180px] rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur', className)}>
      {!hideLabel && label != null ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{String(label)}</div>
      ) : null}

      <div className="space-y-2">
        {items.map((item, index) => {
          const resolved = resolveConfigEntry(config, item)
          const color = resolved?.entry.color || item.color || '#0f172a'
          const name = String(resolved?.entry.label || item.name || item.dataKey || 'Value')
          const value = valueFormatter ? valueFormatter(item.value ?? '', name) : item.value

          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span>{name}</span>
              </div>
              <span className="font-semibold text-slate-900">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartLegendContent({
  payload,
  className,
}: LegendProps & {
  className?: string
}) {
  const { config } = useChart()
  const items = (payload as PayloadItem[] | undefined) ?? []

  if (!items.length) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-4 pt-3 text-sm', className)}>
      {items.map((item, index) => {
        const resolved = resolveConfigEntry(config, item)
        const color = resolved?.entry.color || item.color || '#0f172a'
        const label = String(resolved?.entry.label || item.value || item.name || item.dataKey || 'Value')

        return (
          <div key={`${label}-${index}`} className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
