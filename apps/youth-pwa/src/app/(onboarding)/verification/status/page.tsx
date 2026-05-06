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
  const digitalIdIssued = profile?.digitalIdStatus === 'active'

  const statusInfo = {
    pending: {
      icon: '⏳',
      title: 'Verification Pending',
      desc:
        queueStatus === 'pending_superadmin_id_generation'
          ? 'Your documents were cleared and are now waiting for superadmin Digital ID generation.'
          : 'Your profile is under review by KK admin. This usually takes 3-5 business days.',
      color: 'bg-yellow-50 border-yellow-200',
    },
    verified: {
      icon: '✅',
      title: 'Profile Verified!',
      desc: digitalIdIssued
        ? 'Congratulations! Your profile is verified and your Digital ID is active.'
        : 'Congratulations! Your profile is verified. Rewards access is available, and your Digital ID is waiting for superadmin issuance.',
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
      <div className="px-5 pb-8 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : !profile ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Profile not found. Please complete your profiling first.</p>
            <Link href="/intro">
              <Button className="mt-4">Start Profiling</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`rounded-2xl border p-5 text-center ${
                statusInfo[profile.status]?.color || 'bg-gray-50 border-gray-200'
              }`}
            >
              <p className="mb-3 text-4xl">{statusInfo[profile.status]?.icon || '❔'}</p>
              <h2 className="mb-1 text-xl font-black text-gray-900">
                {statusInfo[profile.status]?.title}
              </h2>
              <p className="text-sm text-gray-600">{statusInfo[profile.status]?.desc}</p>
              <div className="mt-3">
                <Badge status={profile.status} />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-bold text-gray-900">Verification Steps</h3>
              {[
                {
                  label: 'Profile Submitted',
                  done: !!profile.submittedAt,
                  date: profile.submittedAt
                    ? new Date(profile.submittedAt).toLocaleDateString('en-PH')
                    : null,
                },
                { label: 'Documents Uploaded', done: !!profile.documentsSubmitted, date: null },
                {
                  label: 'Under Review',
                  done: ['pending', 'in_review', 'pending_superadmin_id_generation', 'verified', 'rejected', 'resubmission_requested'].includes(
                    queueStatus
                  ),
                  date: null,
                },
                {
                  label: 'Verification Complete',
                  done: profile.status === 'verified',
                  date: profile.verifiedAt
                    ? new Date(profile.verifiedAt).toLocaleDateString('en-PH')
                    : null,
                },
              ].map((step, i) => (
                <div key={i} className="mb-3 flex items-start gap-3 last:mb-0">
                  <div
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                      step.done ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    {step.done ? (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {step.date ? <p className="mt-0.5 text-xs text-gray-400">{step.date}</p> : null}
                  </div>
                </div>
              ))}
            </div>

            {profile.status === 'verified' ? (
              <div className="space-y-3">
                {!digitalIdIssued ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Your verification is already approved. The Digital ID tab will show your card after the superadmin finishes the issuance step.
                  </div>
                ) : null}
                <Link href={digitalIdIssued ? '/scanner/digital-id' : '/home'}>
                  <Button fullWidth size="lg">
                    {digitalIdIssued ? 'Open Digital ID' : 'Go to Home'}
                  </Button>
                </Link>
              </div>
            ) : null}

            {profile.status === 'rejected' ? (
              <div className="space-y-3">
                {profile.verificationRejectReason || profile.verificationRejectNote ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {profile.verificationRejectReason}
                    {profile.verificationRejectNote ? ` ${profile.verificationRejectNote}` : ''}
                  </div>
                ) : null}
                <Link href="/verification/upload">
                  <Button fullWidth>Retry Submission</Button>
                </Link>
              </div>
            ) : null}

            {queueStatus === 'resubmission_requested' ? (
              <Link href="/verification/upload">
                <Button fullWidth>Re-upload Requested Documents</Button>
              </Link>
            ) : null}

            {profile.status === 'pending' ? (
              <div className="text-center text-sm text-gray-400">
                <p>
                  Current queue status:{' '}
                  {queueStatus === 'pending_superadmin_id_generation'
                    ? 'pending superadmin ID generation'
                    : queueStatus.split('_').join(' ')}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
