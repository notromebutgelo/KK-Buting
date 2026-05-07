'use client'

type LoadingModalProps = {
  open: boolean
  title?: string
  description?: string
}

export default function LoadingModal({
  open,
  title = 'Processing request',
  description = 'Please wait while we prepare the form and save your changes.',
}: LoadingModalProps) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-md"
      style={{
        background:
          'linear-gradient(180deg, rgba(1, 67, 132, 0.18), rgba(1, 67, 132, 0.12)), rgba(4, 26, 51, 0.18)',
      }}
    >
      <div
        role="status"
        aria-live="polite"
        className="relative w-full max-w-md overflow-hidden rounded-[32px] border px-8 py-8 text-center"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent) 14%, var(--card-solid) 86%)',
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--accent-soft) 18%, var(--card-solid) 82%) 0%, color-mix(in srgb, var(--card-solid) 96%, transparent) 100%)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background:
              'linear-gradient(90deg, var(--brand-gold) 0%, var(--brand-gold-soft) 30%, var(--brand-blue) 100%)',
          }}
        />
        <div
          className="mx-auto inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{
            background: 'var(--accent-warm-soft)',
            color: 'var(--accent-warm-strong)',
          }}
        >
          Please wait
        </div>
        <div
          className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background:
              'radial-gradient(circle at top, #ffe8b6 0%, var(--accent-warm) 52%, var(--brand-gold-soft) 100%)',
            boxShadow: '0 18px 40px rgba(252, 179, 21, 0.28)',
          }}
        >
          <span
            className="h-10 w-10 animate-spin rounded-full border-[3px]"
            style={{
              borderColor: 'rgba(1, 67, 132, 0.18)',
              borderTopColor: 'var(--accent)',
            }}
          />
        </div>
        <h2 className="mt-6 text-[1.65rem] font-black tracking-tight" style={{ color: 'var(--ink)' }}>
          {title}
        </h2>
        <p
          className="mx-auto mt-3 max-w-[28rem] text-[0.95rem] leading-7"
          style={{ color: 'var(--ink-soft)' }}
        >
          {description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--brand-blue)', opacity: 1 }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--brand-blue)', opacity: 0.48 }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--brand-blue)', opacity: 0.24 }}
          />
        </div>
      </div>
    </div>
  )
}
