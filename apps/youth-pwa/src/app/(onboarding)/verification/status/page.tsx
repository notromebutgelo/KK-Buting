'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/utils/cn'
import { getVerificationStatus } from '@/services/verification.service'
import type { UserProfile } from '@/store/userStore'
import Spinner from '@/components/ui/Spinner'

type StepState = 'completed' | 'current' | 'pending' | 'attention'

type StatusHero = {
  title: string
  description: string
  badgeLabel: string
  tone: 'verified' | 'pending' | 'attention' | 'rejected'
}

type NextPanel = {
  title: string
  description: string
  tone: 'info' | 'warning' | 'danger'
}

type PrimaryAction = {
  href: string
  label: string
}

type TimelineStep = {
  label: string
  state: StepState
  detail: string
  badgeLabel: string
}

export default function VerificationStatusPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getVerificationStatus()
      .then((nextProfile) => {
        if (mounted) {
          setProfile(nextProfile)
        }
      })
      .catch(() => {
        if (mounted) {
          setProfile(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const queueStatus =
    profile?.verificationQueueStatus ||
    (profile?.documentsSubmitted ? 'pending' : 'not_submitted')
  const digitalIdIssued = profile?.digitalIdStatus === 'active'
  const hero = useMemo(
    () => buildStatusHero(profile, queueStatus, digitalIdIssued),
    [digitalIdIssued, profile, queueStatus]
  )
  const nextPanel = useMemo(
    () => buildNextPanel(profile, queueStatus, digitalIdIssued),
    [digitalIdIssued, profile, queueStatus]
  )
  const primaryAction = useMemo(
    () => buildPrimaryAction(profile, queueStatus, digitalIdIssued),
    [digitalIdIssued, profile, queueStatus]
  )
  const timelineSteps = useMemo(
    () => buildTimelineSteps(profile, queueStatus),
    [profile, queueStatus]
  )

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(digitalIdIssued ? '/scanner/digital-id' : '/home')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#edf4fd_0%,#f6fbff_32%,#fffaf0_72%,#f5f6f8_100%)] px-5 py-16">
        <div className="mx-auto flex min-h-[70vh] max-w-[960px] items-center justify-center rounded-[30px] border border-[#dfe8f5] bg-white/92 shadow-[0_20px_54px_rgba(1,67,132,0.08)]">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#edf4fd_0%,#f6fbff_32%,#fffaf0_72%,#f5f6f8_100%)] px-5 py-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto max-w-[960px] overflow-hidden rounded-[30px] border border-[#dfe8f5] bg-white/94 shadow-[0_20px_54px_rgba(1,67,132,0.08)]">
          <StatusHeader onClose={handleClose} />
          <div className="border-t border-[#e9eff7] px-5 py-7 sm:px-8 sm:py-8">
            <div className="rounded-[28px] border border-[#dbe7f6] bg-[#f8fbff] px-6 py-8 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.98)_0%,rgba(230,240,252,0.92)_60%,rgba(213,229,248,0.7)_100%)]">
                <StatusBadgeIcon tone="pending" />
              </div>
              <h2 className="mt-6 text-[28px] font-black text-[#17356d]">
                Profile Not Found
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[17px] leading-8 text-[#4d6792]">
                Complete your KK profiling first so we can track your verification steps and unlock your Digital ID.
              </p>
            </div>

            <Link
              href="/intro"
              className="mt-6 inline-flex w-full items-center justify-center rounded-[22px] bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-5 text-[19px] font-bold text-white shadow-[0_18px_34px_rgba(1,67,132,0.16)]"
            >
              Start Profiling
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf4fd_0%,#f6fbff_32%,#fffaf0_72%,#f5f6f8_100%)] px-5 py-[calc(env(safe-area-inset-top)+20px)] text-[#014384]">
      <div className="mx-auto max-w-[960px] overflow-hidden rounded-[30px] border border-[#dfe8f5] bg-white/94 shadow-[0_20px_54px_rgba(1,67,132,0.08)]">
        <StatusHeader onClose={handleClose} />

        <div className="border-t border-[#e9eff7] px-5 py-5 sm:px-8 sm:py-8">
          <div className="space-y-5">
            <StatusHeroCard hero={hero} />

            <section className="rounded-[28px] border border-[#dfe8f5] bg-white px-5 py-6 shadow-[0_12px_26px_rgba(1,67,132,0.04)] sm:px-7">
              <h2 className="text-[18px] font-black text-[#17356d] sm:text-[20px]">
                Verification Steps
              </h2>

              <div className="mt-6 space-y-0">
                {timelineSteps.map((step, index) => (
                  <TimelineRow
                    key={step.label}
                    step={step}
                    isLast={index === timelineSteps.length - 1}
                  />
                ))}
              </div>
            </section>

            {(profile.verificationRejectReason || profile.verificationRejectNote) &&
            (profile.status === 'rejected' ||
              queueStatus === 'resubmission_requested') ? (
              <section className="rounded-[24px] border border-[#f3d4d4] bg-[#fff4f4] px-5 py-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#c15050]">
                  Review Feedback
                </p>
                <p className="mt-2 text-[14px] leading-7 text-[#9e4040]">
                  {profile.verificationRejectReason}
                  {profile.verificationRejectNote
                    ? ` ${profile.verificationRejectNote}`
                    : ''}
                </p>
              </section>
            ) : null}

            <NextPanelCard panel={nextPanel} />

            <Link
              href={primaryAction.href}
              className="inline-flex w-full items-center justify-center gap-3 rounded-[22px] bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-6 py-5 text-[19px] font-bold text-white shadow-[0_18px_34px_rgba(1,67,132,0.16)] transition hover:opacity-95"
            >
              <CredentialButtonIcon />
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(180deg,#eaf2ff_0%,#f5f9ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <HeaderShieldIcon />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-black text-[#17356d] sm:text-[30px]">
            Verification Status
          </h1>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#d9e4f2] bg-white text-[#214b8f] shadow-[0_10px_18px_rgba(1,67,132,0.04)] transition hover:bg-[#f7fbff]"
        aria-label="Close verification status"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

function StatusHeroCard({ hero }: { hero: StatusHero }) {
  const toneStyles = {
    verified: {
      border: 'border-[#bfe7c8]',
      background:
        'bg-[radial-gradient(circle_at_top_left,rgba(242,255,247,0.98)_0%,rgba(249,255,251,0.96)_42%,rgba(255,255,255,0.98)_100%)]',
      text: 'text-[#17356d]',
      description: 'text-[#4d6792]',
      badge: 'border-[#c8ead2] bg-[#edf9f0] text-[#2d9b54]',
    },
    pending: {
      border: 'border-[#d9e7fb]',
      background:
        'bg-[radial-gradient(circle_at_top_left,rgba(241,247,255,0.98)_0%,rgba(249,252,255,0.96)_44%,rgba(255,255,255,0.98)_100%)]',
      text: 'text-[#17356d]',
      description: 'text-[#4d6792]',
      badge: 'border-[#dce8f7] bg-[#eef5ff] text-[#0f5eb3]',
    },
    attention: {
      border: 'border-[#f3ddb1]',
      background:
        'bg-[radial-gradient(circle_at_top_left,rgba(255,250,240,0.98)_0%,rgba(255,252,247,0.96)_44%,rgba(255,255,255,0.98)_100%)]',
      text: 'text-[#17356d]',
      description: 'text-[#6d5a23]',
      badge: 'border-[#f3ddb1] bg-[#fff8ea] text-[#b88408]',
    },
    rejected: {
      border: 'border-[#f1d0d0]',
      background:
        'bg-[radial-gradient(circle_at_top_left,rgba(255,244,244,0.98)_0%,rgba(255,249,249,0.96)_44%,rgba(255,255,255,0.98)_100%)]',
      text: 'text-[#17356d]',
      description: 'text-[#8f4c4c]',
      badge: 'border-[#f1d4d4] bg-[#fff1f1] text-[#c44f4f]',
    },
  } as const

  const tone = toneStyles[hero.tone]

  return (
    <section
      className={cn(
        'rounded-[28px] border px-5 py-6 shadow-[0_14px_30px_rgba(1,67,132,0.04)] sm:px-7 sm:py-7',
        tone.border,
        tone.background
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex justify-center sm:block">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.98)_0%,rgba(237,245,252,0.84)_56%,rgba(221,241,230,0.75)_100%)]">
            <StatusBadgeIcon tone={hero.tone} />
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className={cn('text-[34px] font-black leading-[1.05] sm:text-[42px]', tone.text)}>
            {hero.title}
          </h2>
          <p className={cn('mt-3 text-[18px] leading-8 sm:max-w-[560px]', tone.description)}>
            {hero.description}
          </p>
          <div className="mt-5">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[16px] font-bold',
                tone.badge
              )}
            >
              <StatusDot tone={hero.tone} />
              {hero.badgeLabel}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function TimelineRow({
  step,
  isLast,
}: {
  step: TimelineStep
  isLast: boolean
}) {
  const stepTone = getStepTone(step.state)

  return (
    <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-4 pb-7 last:pb-0 md:grid-cols-[58px_minmax(0,1fr)_auto]">
      <div className="relative flex justify-center">
        {!isLast ? (
          <span
            className={cn(
              'absolute top-12 h-[calc(100%-6px)] w-[3px] rounded-full',
              step.state === 'completed' ? 'bg-[#2fb45a]' : 'bg-[#d8e6f6]'
            )}
          />
        ) : null}
        <span
          className={cn(
            'relative z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_10px_18px_rgba(1,67,132,0.06)]',
            stepTone.iconWrap
          )}
        >
          <StepStateIcon state={step.state} />
        </span>
      </div>

      <div
        className={cn(
          'min-w-0',
          !isLast ? 'border-b border-[#edf1f7] pb-7' : ''
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[18px] font-black text-[#17356d] sm:text-[20px]">
              {step.label}
            </p>
            <p className="mt-1 text-[15px] leading-7 text-[#7086aa]">
              {step.detail}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex w-fit items-center rounded-full border px-4 py-2 text-[14px] font-bold',
              stepTone.badge
            )}
          >
            {step.badgeLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function NextPanelCard({ panel }: { panel: NextPanel }) {
  const toneStyles = {
    info: 'border-[#dce8f7] bg-[linear-gradient(180deg,#f5f9ff_0%,#eef5ff_100%)]',
    warning:
      'border-[#f2deb7] bg-[linear-gradient(180deg,#fffaf0_0%,#fff7ea_100%)]',
    danger:
      'border-[#efd5d5] bg-[linear-gradient(180deg,#fff6f6_0%,#fff1f1_100%)]',
  } as const

  return (
    <section
      className={cn(
        'rounded-[24px] border px-5 py-5 shadow-[0_12px_24px_rgba(1,67,132,0.03)] sm:px-7',
        toneStyles[panel.tone]
      )}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#4a8eff_0%,#2e72e5_100%)] text-white shadow-[0_10px_18px_rgba(46,114,229,0.18)]">
          <InfoIcon />
        </div>
        <div className="min-w-0">
          <h3 className="text-[20px] font-black text-[#17356d]">
            {panel.title}
          </h3>
          <p className="mt-2 text-[16px] leading-8 text-[#4d6792]">
            {panel.description}
          </p>
        </div>
      </div>
    </section>
  )
}

function HeaderShieldIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 5.5 5.4v5.9c0 4.1 2.6 7.8 6.5 9.2 3.9-1.4 6.5-5.1 6.5-9.2V5.4L12 3Z"
        stroke="#2f78de"
        strokeWidth="1.8"
        fill="url(#shieldFill)"
      />
      <path
        d="m9.2 12.2 1.8 1.8 3.8-4.2"
        stroke="#2f78de"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="shieldFill" x1="12" x2="12" y1="3" y2="20.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fbff" />
          <stop offset="1" stopColor="#e8f1ff" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

function StatusBadgeIcon({
  tone,
}: {
  tone: StatusHero['tone']
}) {
  const toneMap = {
    verified: {
      shield: '#2ea84f',
      glow: 'from-[#e9faef] to-[#dff5e6]',
      stroke: '#ffffff',
    },
    pending: {
      shield: '#2f78de',
      glow: 'from-[#edf5ff] to-[#dbe9ff]',
      stroke: '#ffffff',
    },
    attention: {
      shield: '#d49a13',
      glow: 'from-[#fff8ec] to-[#fff0d2]',
      stroke: '#ffffff',
    },
    rejected: {
      shield: '#d65858',
      glow: 'from-[#fff3f3] to-[#ffe2e2]',
      stroke: '#ffffff',
    },
  } as const

  const palette = toneMap[tone]

  return (
    <div
      className={cn(
        'flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]',
        palette.glow
      )}
    >
      <svg width="74" height="74" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3 5.5 5.4v5.9c0 4.1 2.6 7.8 6.5 9.2 3.9-1.4 6.5-5.1 6.5-9.2V5.4L12 3Z"
          fill={palette.shield}
        />
        {tone === 'rejected' ? (
          <path
            d="m9 9 6 6m0-6-6 6"
            stroke={palette.stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : tone === 'pending' || tone === 'attention' ? (
          <path
            d="M12 8v4.3l2.6 1.6"
            stroke={palette.stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="m8.7 12.4 2.2 2.2 4.7-5.1"
            stroke={palette.stroke}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}

function StatusDot({ tone }: { tone: StatusHero['tone'] }) {
  const classes = {
    verified: 'bg-[#2ea84f]',
    pending: 'bg-[#2f78de]',
    attention: 'bg-[#d49a13]',
    rejected: 'bg-[#d65858]',
  } as const

  return <span className={cn('h-2.5 w-2.5 rounded-full', classes[tone])} />
}

function StepStateIcon({ state }: { state: StepState }) {
  if (state === 'completed') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m5 13 4 4L19 7"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (state === 'attention') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 7v5m0 3.2h.01"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (state === 'current') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 7v5m0 0 3 1.8"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return <span className="h-3 w-3 rounded-full bg-white/90" />
}

function CredentialButtonIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8.2" cy="11.7" r="2.1" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12.6 10h4.1M12.6 13.3h4.1M6 16.2h10.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 10.2v6m0-10.2h.01"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function getStepTone(state: StepState) {
  if (state === 'completed') {
    return {
      iconWrap: 'bg-[#2fb45a]',
      badge: 'border-[#c8ead2] bg-[#edf9f0] text-[#2d9b54]',
    }
  }

  if (state === 'current') {
    return {
      iconWrap: 'bg-[#2f78de]',
      badge: 'border-[#d8e6fb] bg-[#eef5ff] text-[#0f5eb3]',
    }
  }

  if (state === 'attention') {
    return {
      iconWrap: 'bg-[#d49a13]',
      badge: 'border-[#f3ddb1] bg-[#fff8ea] text-[#b88408]',
    }
  }

  return {
    iconWrap: 'bg-[#d9e3ef]',
    badge: 'border-[#e6edf6] bg-[#f6f9fd] text-[#8195b3]',
  }
}

function buildStatusHero(
  profile: UserProfile | null,
  queueStatus: string,
  digitalIdIssued: boolean
): StatusHero {
  if (queueStatus === 'resubmission_requested') {
    return {
      title: 'Update Required',
      description:
        'Your verification needs updated documents before it can continue. Review the request below and submit the required files again.',
      badgeLabel: 'Resubmission Requested',
      tone: 'attention',
    }
  }

  if (profile?.status === 'rejected') {
    return {
      title: 'Verification Rejected',
      description:
        'Your submission could not be approved yet. Review the feedback below and send a corrected verification set to continue.',
      badgeLabel: 'Rejected',
      tone: 'rejected',
    }
  }

  if (profile?.status === 'verified') {
    return {
      title: 'Profile Verified!',
      description: digitalIdIssued
        ? 'Congratulations! Your profile is verified and your Digital ID is active.'
        : 'Congratulations! Your profile is verified. Your rewards access is active and your Digital ID is waiting for final issuance.',
      badgeLabel: 'Verified',
      tone: 'verified',
    }
  }

  return {
    title:
      queueStatus === 'pending_superadmin_id_generation'
        ? 'Awaiting Digital ID Issuance'
        : 'Verification In Review',
    description:
      queueStatus === 'pending_superadmin_id_generation'
        ? 'Your verification documents were already cleared. The final Digital ID issuance step is now waiting on the superadmin.'
        : 'Your profile is currently under review by the KK team. We will notify you as soon as the decision is ready.',
    badgeLabel:
      queueStatus === 'pending_superadmin_id_generation'
        ? 'Ready for issuance'
        : 'Under Review',
    tone: 'pending',
  }
}

function buildNextPanel(
  profile: UserProfile | null,
  queueStatus: string,
  digitalIdIssued: boolean
): NextPanel {
  if (queueStatus === 'resubmission_requested') {
    return {
      title: 'What’s Next?',
      description:
        profile?.verificationResubmissionMessage ||
        'Prepare the requested replacement documents and upload them again so the verification review can continue.',
      tone: 'warning',
    }
  }

  if (profile?.status === 'rejected') {
    return {
      title: 'What’s Next?',
      description:
        'Review the feedback carefully, update your verification files, and submit a corrected application when you are ready.',
      tone: 'danger',
    }
  }

  if (profile?.status === 'verified') {
    return {
      title: 'What’s Next?',
      description: digitalIdIssued
        ? 'Your Digital ID is now active. You can view, save, and share your Digital ID for verification purposes.'
        : 'Your verification is already approved. The Digital ID tab will show your final card after the superadmin finishes the issuance step.',
      tone: 'info',
    }
  }

  if (queueStatus === 'pending_superadmin_id_generation') {
    return {
      title: 'What’s Next?',
      description:
        'Your document review is already complete. We are now waiting for final superadmin Digital ID issuance before the card appears in the app.',
      tone: 'info',
    }
  }

  return {
    title: 'What’s Next?',
    description:
      'Keep an eye on your notifications. Once the KK office finishes reviewing your submission, you will see the result here immediately.',
    tone: 'info',
  }
}

function buildPrimaryAction(
  profile: UserProfile | null,
  queueStatus: string,
  digitalIdIssued: boolean
): PrimaryAction {
  if (queueStatus === 'resubmission_requested') {
    return {
      href: '/verification/upload',
      label: 'Re-upload Requested Documents',
    }
  }

  if (profile?.status === 'rejected') {
    return {
      href: '/verification/upload',
      label: 'Retry Submission',
    }
  }

  if (profile?.status === 'verified') {
    return {
      href: digitalIdIssued ? '/scanner/digital-id' : '/home',
      label: digitalIdIssued ? 'Open Digital ID' : 'Go to Home',
    }
  }

  return {
    href: '/home',
    label: 'Return to Home',
  }
}

function buildTimelineSteps(
  profile: UserProfile | null,
  queueStatus: string
): TimelineStep[] {
  const reviewReached = [
    'pending',
    'in_review',
    'pending_superadmin_id_generation',
    'verified',
    'rejected',
    'resubmission_requested',
  ].includes(queueStatus)

  return [
    {
      label: 'Profile Submitted',
      state: profile?.submittedAt ? 'completed' : 'pending',
      detail: profile?.submittedAt
        ? formatTimelineDate(profile.submittedAt)
        : 'Waiting for profile submission',
      badgeLabel: profile?.submittedAt ? 'Completed' : 'Pending',
    },
    {
      label: 'Documents Uploaded',
      state: profile?.documentsSubmitted ? 'completed' : 'pending',
      detail: profile?.documentsSubmitted
        ? formatTimelineDate(profile.submittedAt)
        : 'Verification documents still required',
      badgeLabel: profile?.documentsSubmitted ? 'Completed' : 'Pending',
    },
    {
      label: 'Under Review',
      state:
        queueStatus === 'resubmission_requested'
          ? 'attention'
          : profile?.status === 'rejected'
            ? 'attention'
            : profile?.status === 'verified'
              ? 'completed'
              : reviewReached
                ? 'current'
                : 'pending',
      detail:
        queueStatus === 'pending_superadmin_id_generation'
          ? 'Admin review completed and forwarded for issuance'
          : queueStatus === 'resubmission_requested'
            ? 'Updated files were requested before approval'
            : profile?.status === 'rejected'
              ? 'Review ended with a rejection decision'
              : profile?.status === 'verified'
                ? formatTimelineDate(profile.verifiedAt)
                : reviewReached
                  ? 'Currently being reviewed by KK admin'
                  : 'Waiting for document submission',
      badgeLabel:
        queueStatus === 'resubmission_requested'
          ? 'Needs Action'
          : profile?.status === 'rejected'
            ? 'Stopped'
            : profile?.status === 'verified'
              ? 'Completed'
              : reviewReached
                ? 'In Review'
                : 'Pending',
    },
    {
      label: 'Verification Complete',
      state:
        profile?.status === 'verified'
          ? 'completed'
          : profile?.status === 'rejected'
            ? 'attention'
            : 'pending',
      detail:
        profile?.status === 'verified'
          ? formatTimelineDate(profile.verifiedAt)
          : profile?.status === 'rejected'
            ? 'Verification closed without approval'
            : 'Awaiting final approval',
      badgeLabel:
        profile?.status === 'verified'
          ? 'Completed'
          : profile?.status === 'rejected'
            ? 'Not Approved'
            : 'Pending',
    },
  ]
}

function formatTimelineDate(value?: string) {
  if (!value) {
    return 'Date not yet recorded'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Date not yet recorded'
  }

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
