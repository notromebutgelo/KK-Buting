'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { signOut } from '@/services/auth.service'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'
import { clearYouthSession } from '@/lib/session'

const menuItems = [
  {
    href: '/profile/edit',
    label: 'Edit Profile',
    description: 'Update your account name and manage the emergency contact shown on your Digital ID.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    href: '/profile/change-password',
    label: 'Change Password',
    description: 'Secure your account with a fresh password whenever you need to.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
  {
    href: '/profile/notifications',
    label: 'Notifications',
    description: 'See approval updates, reminders, and reward activity in one place.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
  {
    href: '/profile/terms',
    label: 'Terms of Service',
    description: 'Review the policies and account guidelines for using the KK system.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: '/profile/help',
    label: 'Help & FAQ',
    description: 'Get quick answers about verification, rewards, and account access.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, isLoading } = useAuthStore()
  const { profile, setProfile } = useUserStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, router, user])

  const displayName = useMemo(() => {
    if (profile) {
      const fullName = [profile.firstName, profile.middleName, profile.lastName, profile.suffix]
        .filter(Boolean)
        .join(' ')
        .trim()

      if (fullName) {
        return fullName
      }
    }

    return user?.UserName || 'Youth Member'
  }, [profile, user?.UserName])

  const memberLocation = useMemo(() => {
    if (!profile) {
      return 'Not set'
    }

    const parts = [profile.barangay, profile.city, profile.province].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Not set'
  }, [profile])

  const emergencyContactComplete = hasCompleteEmergencyContact(profile)

  const handleLogout = async () => {
    setIsSigningOut(true)

    try {
      await signOut()
    } finally {
      await clearYouthSession()
      setProfile(null)
      logout()
      setIsSigningOut(false)
      setShowLogoutConfirm(false)
      router.push('/login')
    }
  }

  if (isLoading || !user) {
    return <Spinner fullPage />
  }

  return (
    <>
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => {
          if (!isSigningOut) {
            setShowLogoutConfirm(false)
          }
        }}
        title="Sign out?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-gray-600">
            You&apos;re about to sign out of your KK Buting account on this device.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setShowLogoutConfirm(false)}
              disabled={isSigningOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              isLoading={isSigningOut}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>

      <div className="min-h-full bg-gray-50 px-5 pb-8 pt-6">
        <section>
          <div className="rounded-[30px] bg-[linear-gradient(135deg,#014384_0%,#035db7_58%,#0a74de_100%)] p-5 text-white shadow-[0_18px_38px_rgba(1,67,132,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white/16 ring-4 ring-white/20">
                  <span className="text-3xl font-black text-white">
                    {getInitials(displayName) || 'Y'}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Account Overview
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/75">KK Youth Member</p>
                  <h1 className="mt-1 text-[24px] font-black leading-7">{displayName}</h1>
                  <p className="mt-2 max-w-[220px] text-[13px] leading-[1.55] text-white/78 [overflow-wrap:anywhere]">
                    {user.email || 'No email on file'}
                  </p>
                </div>
              </div>

              {profile ? (
                <Badge
                  status={profile.status}
                  className="border-white/20 bg-white/14 text-white [&>span:first-child]:bg-[#fcb315]"
                />
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <ProfileStat label="Age Group" value={profile?.youthAgeGroup || 'Not set'} />
              <ProfileStat label="Location" value={memberLocation} />
              <ProfileStat label="Classification" value={profile?.youthClassification || 'Not set'} />
              <ProfileStat label="Work Status" value={profile?.workStatus || 'Not set'} />
            </div>

            {!profile ? (
              <Link
                href="/intro"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#ffd67d_0%,#fcba2c_58%,#fcb315_100%)] px-5 py-4 text-[15px] font-bold text-white shadow-[0_12px_24px_rgba(252,179,21,0.28)]"
              >
                Complete Profile Setup
              </Link>
            ) : null}
          </div>

          <div className="mt-4 rounded-[26px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(1,67,132,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
                  Member Snapshot
                </p>
                <h2 className="mt-1 text-[18px] font-extrabold text-[#014384]">
                  Your community profile
                </h2>
              </div>
              <div className="rounded-full bg-[#edf4fb] px-3 py-1 text-[11px] font-bold text-[#0a4e99]">
                KK Buting
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <InfoCard label="Full Name" value={displayName} />
              <InfoCard label="Email" value={user.email || 'No email on file'} />
              <InfoCard label="Barangay" value={profile?.barangay || 'Not set yet'} />
              <InfoCard label="City / Municipality" value={profile?.city || 'Not set yet'} />
            </div>
          </div>

          {profile && !emergencyContactComplete ? (
            <div className="mt-4 rounded-[24px] border border-[#ffe1a6] bg-[#fff8eb] px-5 py-4 shadow-[0_10px_22px_rgba(252,179,21,0.10)]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#b88408]">
                Digital ID Reminder
              </p>
              <h2 className="mt-2 text-[17px] font-extrabold text-[#014384]">
                Add your emergency contact
              </h2>
              <p className="mt-2 text-[13px] leading-[1.6] text-[#6f5a1d]">
                Your Digital ID cannot be generated or activated until the emergency contact on the back of the card is complete.
              </p>
              <Link
                href="/profile/edit"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035db7_58%,#0a74de_100%)] px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(1,67,132,0.16)]"
              >
                Update Emergency Contact
              </Link>
            </div>
          ) : null}

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-[#014384]">Profile Tools</h2>
              <span className="text-[12px] font-medium text-[#6c87ab]">Manage your account</span>
            </div>

            <div className="space-y-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(1,67,132,0.06)] transition-transform duration-200 hover:-translate-y-[1px]"
                >
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#edf4fb_0%,#d6e7f7_100%)] text-[#014384]">
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-[#014384]">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-[12px] leading-[1.45] text-[#5f7b9d]">
                      {item.description}
                    </span>
                  </span>

                  <svg className="h-5 w-5 flex-shrink-0 text-[#9ab4d3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-red-600 shadow-sm transition-colors hover:bg-red-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">{label}</p>
      <p className="mt-2 text-[14px] font-bold leading-5 text-white">{value}</p>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[#e1ebf5] bg-[#f8fbff] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e95b2]">{label}</p>
      <p className="mt-2 text-[14px] font-bold leading-5 text-[#014384] [overflow-wrap:anywhere]">{value}</p>
    </div>
  )
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function hasCompleteEmergencyContact(
  profile:
    | {
        digitalIdEmergencyContactName?: string
        digitalIdEmergencyContactRelationship?: string
        digitalIdEmergencyContactPhone?: string
      }
    | null
    | undefined
) {
  return Boolean(
    String(profile?.digitalIdEmergencyContactName || '').trim() &&
      String(profile?.digitalIdEmergencyContactRelationship || '').trim() &&
      String(profile?.digitalIdEmergencyContactPhone || '').trim()
  )
}
