import { Suspense } from 'react'
import ResetPasswordPageClient from './ResetPasswordPageClient'

function ResetPasswordFallback() {
  return <div className="min-h-screen bg-gray-50" />
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordPageClient />
    </Suspense>
  )
}
