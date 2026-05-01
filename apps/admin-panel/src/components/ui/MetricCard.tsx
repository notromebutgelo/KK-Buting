import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  meta?: string;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const toneStyles = {
  default: { color: 'var(--accent-strong)', background: 'var(--accent-soft)' },
  success: { color: 'var(--success-fg)', background: 'var(--success-bg)' },
  warning: { color: 'var(--warning-fg)', background: 'var(--warning-bg)' },
  danger: { color: 'var(--danger-fg)', background: 'var(--danger-bg)' },
  info: { color: 'var(--info-fg)', background: 'var(--info-bg)' },
};

export default function MetricCard({ title, value, meta, icon, tone = 'default' }: MetricCardProps) {
  return (
    <div className="admin-card group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {title}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            {value}
          </div>
        </div>
        {icon && (
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={toneStyles[tone]}
          >
            {icon}
          </div>
        )}
      </div>
      {meta && (
        <div className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          {meta}
        </div>
      )}
    </div>
  );
}
