'use client'
import Link from 'next/link'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { useAuthStore } from '@/store/authStore'
import { useUserStore } from '@/store/userStore'
import { signOut } from '@/services/auth.service'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'

const menuItems = [
  {
    href: '/profile/edit',
    label: 'Edit Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: '/profile/change-password',
    label: 'Change Password',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    href: '/profile/notifications',
    label: 'Notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    href: '/profile/terms',
    label: 'Terms of Service',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/profile/help',
    label: 'Help & FAQ',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, isLoading: isAuthLoading } = useAuthStore()
  const { setProfile } = useUserStore()
  const { profile, isLoading: isProfileLoading } = useUser()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login')
    }
  }, [isAuthLoading, router, user])

  const displayName = useMemo(() => {
    const fullName = [profile?.firstName, profile?.middleName, profile?.lastName]
      .filter(Boolean)
      .join(' ')

    return fullName || user?.UserName || user?.email?.split('@')[0] || 'Youth Member'
  }, [profile?.firstName, profile?.lastName, profile?.middleName, user?.UserName, user?.email])

  const handleLogout = async () => {
    try {
      await signOut()
      document.cookie = 'auth-token=; path=/; max-age=0'
      setProfile(null)
      logout()
      router.push('/login')
    } catch {
      // force logout anyway
      document.cookie = 'auth-token=; path=/; max-age=0'
      setProfile(null)
      logout()
      router.push('/login')
    }
  }

  if (isAuthLoading || (!profile && isProfileLoading)) {
    return <Spinner fullPage />
  }

  if (!user) return null

  return (
    <div className="min-h-full bg-gray-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-green-700 to-teal-600 px-5 pt-14 pb-8">
        <div className="flex flex-col items-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center ring-4 ring-white/30 mb-4">
            <span className="text-4xl font-black text-white">
              {displayName.charAt(0).toUpperCase() || 'Y'}
            </span>
          </div>
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-green-200 text-sm mt-0.5">{user.email || 'No email on file'}</p>
          {profile && (
            <div className="mt-3">
              <Badge status={profile.status} />
            </div>
          )}
          {!profile && (
            <Link
              href="/intro"
              className="mt-3 bg-yellow-400 text-green-900 px-4 py-1.5 rounded-full text-sm font-bold hover:bg-yellow-300 transition-colors"
            >
              Complete Profile Setup
            </Link>
          )}
        </div>
      </div>

      {/* Profile Info */}
      {profile && (
        <div className="px-5 -mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-400 text-xs">Full Name</p>
                <p className="text-gray-900 font-medium text-sm">
                  {displayName}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Age Group</p>
                <p className="text-gray-900 font-medium text-sm">{profile.youthAgeGroup || 'Not set yet'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Barangay</p>
                <p className="text-gray-900 font-medium text-sm">{profile.barangay || 'Not set yet'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">City/Municipality</p>
                <p className="text-gray-900 font-medium text-sm">{profile.city || 'Not set yet'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="px-5 mt-4">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-gray-900 font-medium text-sm">{item.label}</span>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 mt-4 pb-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm hover:bg-red-50 transition-colors text-red-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
