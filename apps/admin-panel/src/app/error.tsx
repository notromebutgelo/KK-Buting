'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="admin-panel w-full max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-strong)' }}>
          Admin Panel Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Something went wrong while loading this page.
        </h1>
        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>
          The app hit a runtime error. Try reloading this route first. If it keeps happening, the browser console should now show the real error instead of only the refresh loop.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Try again
          </button>
          <a
            href="/login"
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: 'var(--stroke)', color: 'var(--ink-soft)' }}
          >
            Go to login
          </a>
        </div>
      </div>
    </div>
  )
}
