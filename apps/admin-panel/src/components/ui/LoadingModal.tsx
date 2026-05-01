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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(240,240,240,0.52)] px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-[28px] border p-7 text-center"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent) 10%, white 90%)',
          background: 'rgba(255, 255, 255, 0.96)',
          boxShadow: '0 28px 80px rgba(1, 67, 132, 0.18)',
        }}
      >
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle at top, #ffe09a 0%, var(--accent-warm) 54%, var(--brand-gold-soft) 100%)',
            boxShadow: '0 14px 34px rgba(252, 179, 21, 0.24)',
          }}
        >
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[rgba(1,67,132,0.18)] border-t-[color:var(--accent)]" />
        </div>
        <h2 className="mt-5 text-xl font-black" style={{ color: 'var(--accent)' }}>
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          {description}
        </p>
      </div>
    </div>
  )
}
