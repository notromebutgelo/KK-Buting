'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getVerificationStatus } from '@/services/verification.service'
import type { UserProfile } from '@/store/userStore'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function VerificationStatusPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getVerificationStatus()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const queueStatus =
    profile?.verificationQueueStatus ||
    (profile?.documentsSubmitted ? 'pending' : 'not_submitted')

  const statusInfo = {
    pending: {
      icon: '⏳',
      title: 'Verification Pending',
      desc: 'Your profile is under review by KK admin. This usually takes 3-5 business days.',
      color: 'bg-yellow-50 border-yellow-200',
    },
    verified: {
      icon: '✅',
      title: 'Profile Verified!',
      desc: 'Congratulations! Your profile has been verified. You can now access all KK features.',
      color: 'bg-green-50 border-green-200',
    },
    rejected: {
      icon: '❌',
      title: 'Verification Rejected',
      desc: 'Your verification was rejected. Please re-upload your ID or contact your local KK office.',
      color: 'bg-red-50 border-red-200',
    },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Verification Status" />
      <div className="px-5 pt-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !profile ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Profile not found. Please complete your profiling first.</p>
            <Link href="/intro">
              <Button className="mt-4">Start Profiling</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Card */}
            <div className={`border rounded-2xl p-5 text-center ${statusInfo[profile.status]?.color || 'bg-gray-50 border-gray-200'}`}>
              <p className="text-4xl mb-3">{statusInfo[profile.status]?.icon || '❓'}</p>
              <h2 className="text-xl font-black text-gray-900 mb-1">{statusInfo[profile.status]?.title}</h2>
              <p className="text-gray-600 text-sm">{statusInfo[profile.status]?.desc}</p>
              <div className="mt-3">
                <Badge status={profile.status} />
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">Verification Steps</h3>
              {[
                { label: 'Profile Submitted', done: !!profile.submittedAt, date: profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString('en-PH') : null },
                { label: 'Documents Uploaded', done: !!profile.documentsSubmitted, date: null },
                { label: 'Under Review', done: ['pending', 'in_review', 'verified', 'rejected', 'resubmission_requested'].includes(queueStatus), date: null },
                { label: 'Verification Complete', done: profile.status === 'verified', date: profile.verifiedAt ? new Date(profile.verifiedAt).toLocaleDateString('en-PH') : null },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.done ? 'bg-green-500' : 'bg-gray-200'
                  }`}>
                    {step.done ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                    {step.date && <p className="text-gray-400 text-xs mt-0.5">{step.date}</p>}
                  </div>
                </div>
              ))}
            </div>

            {profile.status === 'verified' && (
              <Link href="/home">
                <Button fullWidth size="lg">Go to Home</Button>
              </Link>
            )}

            {profile.status === 'rejected' && (
              <Link href="/verification/upload">
                <Button fullWidth>Re-upload ID</Button>
              </Link>
            )}

            {queueStatus === 'resubmission_requested' && (
              <Link href="/verification/upload">
                <Button fullWidth>Re-upload Requested Documents</Button>
              </Link>
            )}

            {profile.status === 'pending' && (
              <div className="text-center text-gray-400 text-sm">
                <p>Current queue status: {queueStatus.split('_').join(' ')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
