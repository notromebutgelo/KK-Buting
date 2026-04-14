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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(252, 252, 252, 0.52)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[28px] border border-white/50 bg-white/96 p-7 text-center shadow-[0_28px_80px_rgba(1,67,132,0.24)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#ffd978_0%,#fcb315_52%,#f4a107_100%)] shadow-[0_14px_34px_rgba(252,179,21,0.28)]">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[rgba(1,67,132,0.18)] border-t-[color:var(--kk-primary)]" />
        </div>
        <h2 className="mt-5 text-xl font-black text-[color:var(--kk-primary)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--kk-muted)]">{description}</p>
      </div>
    </div>
  )
}
