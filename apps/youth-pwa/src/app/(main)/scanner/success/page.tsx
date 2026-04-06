import { Suspense } from 'react'
import ScanSuccessPageClient from './ScanSuccessPageClient'

function ScanSuccessFallback() {
  return <div className="min-h-screen bg-gray-900" />
}

export default function ScanSuccessPage() {
  return (
    <Suspense fallback={<ScanSuccessFallback />}>
      <ScanSuccessPageClient />
    </Suspense>
  )
}
