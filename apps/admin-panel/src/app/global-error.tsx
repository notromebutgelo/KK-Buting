'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
    <html lang="en">
      <body>
        <div
          className="flex min-h-screen items-center justify-center p-6"
          style={{
            background:
              'radial-gradient(circle at 10% -10%, rgba(5, 114, 220, 0.12), transparent 34%), radial-gradient(circle at 92% 0%, rgba(252, 179, 21, 0.16), transparent 28%), #f0f0f0',
          }}
        >
          <div
            className="w-full max-w-lg rounded-[18px] border p-6 shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderColor: 'rgba(1, 67, 132, 0.12)',
              backdropFilter: 'blur(18px)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#0572dc' }}>
              Global App Error
            </p>
            <h1 className="mt-3 text-2xl font-semibold" style={{ color: '#014384' }}>
              The admin app could not finish rendering.
            </h1>
            <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(1, 67, 132, 0.62)' }}>
              A root-level error interrupted rendering. Try the reset button first. If this keeps repeating, the browser console should now show the underlying error more clearly.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: '#014384' }}
              >
                Reset app
              </button>
              <a
                href="/login"
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: 'rgba(1, 67, 132, 0.12)', color: '#014384' }}
              >
                Open login
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
