import { Suspense } from 'react'
import ScanFailedPageClient from './ScanFailedPageClient'

function ScanFailedFallback() {
  return <div className="min-h-screen bg-gray-900" />
}

export default function ScanFailedPage() {
  return (
    <Suspense fallback={<ScanFailedFallback />}>
      <ScanFailedPageClient />
    </Suspense>
  )
}
