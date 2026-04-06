import { Suspense } from 'react'
import OTPPageClient from './OTPPageClient'

function OTPPageFallback() {
  return <div className="min-h-screen bg-[#f5f5f5]" />
}

export default function OTPPage() {
  return (
    <Suspense fallback={<OTPPageFallback />}>
      <OTPPageClient />
    </Suspense>
  )
}
