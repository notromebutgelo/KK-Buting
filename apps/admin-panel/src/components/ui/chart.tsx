'use client';

import type { ReactNode } from 'react';
import { Legend as RechartsLegend, Tooltip as RechartsTooltip } from 'recharts';

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

export function ChartContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  config?: ChartConfig;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-md)] border p-4 ${className}`}
      style={{
        background: 'var(--card)',
        borderColor: 'var(--stroke)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

export function ChartHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </div>
        {description && (
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export const chartTooltipStyle = {
  background: 'var(--card-solid)',
  border: '1px solid var(--stroke)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-md)',
  color: 'var(--ink)',
  fontSize: 12,
};

// Re-export recharts components for backward compatibility
export const ChartTooltip = RechartsTooltip;
export const ChartLegend = RechartsLegend;

// Simple legend content component for backward compatibility
export function ChartLegendContent({
  payload,
  className = '',
}: {
  payload?: Array<{ value?: string; color?: string }>;
  className?: string;
}) {
  if (!payload?.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-3 pt-2 text-xs ${className}`} style={{ color: 'var(--muted)' }}>
      {payload.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.value}
        </span>
      ))}
    </div>
  );
}

// Simple tooltip content component for backward compatibility
export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
  hideLabel?: boolean;
  valueFormatter?: (value: number | string, name: string) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="min-w-[140px] rounded-xl border p-3 text-xs"
      style={{
        background: 'var(--card-solid)',
        borderColor: 'var(--stroke)',
        boxShadow: 'var(--shadow-md)',
        color: 'var(--ink)',
      }}
    >
      {!hideLabel && label && (
        <div className="mb-2 font-semibold" style={{ color: 'var(--muted)' }}>{label}</div>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((item, i) => {
          const name = item.name ?? '';
          const val = item.value ?? '';
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}>
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                {name}
              </span>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                {valueFormatter ? valueFormatter(val, name) : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
