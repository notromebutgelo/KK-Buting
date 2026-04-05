'use client'

import { useEffect, useMemo, useState } from 'react'

import PageHeader from '@/components/layout/PageHeader'
import Spinner from '@/components/ui/Spinner'
import { getMyNotifications, markMyNotificationsRead, type YouthNotification } from '@/services/notifications.service'

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
  account: 'bg-emerald-100 text-emerald-700',
  system: 'bg-slate-100 text-slate-700',
  promotion: 'bg-fuchsia-100 text-fuchsia-700',
  transaction: 'bg-cyan-100 text-cyan-700',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<YouthNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  async function loadNotifications() {
    setIsLoading(true)
    setError(null)

    try {
      const nextNotifications = await getMyNotifications()
      setNotifications(nextNotifications)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Notifications" />
      <div className="px-5 pt-4 space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-gray-900">Your updates</p>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Everything is up to date'}
            </p>
          </div>
          <button
            type="button"
            disabled={isMarkingRead || unreadCount === 0}
            onClick={async () => {
              try {
                setIsMarkingRead(true)
                await markMyNotificationsRead()
                await loadNotifications()
              } finally {
                setIsMarkingRead(false)
              }
            }}
            className="rounded-full bg-[#e7f3ff] px-4 py-2 text-xs font-bold text-[#0d4f92] disabled:opacity-50"
          >
            {isMarkingRead ? 'Updating...' : 'Mark all read'}
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-5 text-sm text-red-700">
            {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-400 font-medium">No notifications yet</p>
            <p className="text-gray-300 text-sm mt-1">We&apos;ll notify you about important updates</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border ${!notif.read ? 'border-green-200' : 'border-gray-100'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColors[notif.type] || typeColors.info}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{notif.title}</p>
                    {!notif.read ? (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">{notif.body}</p>
                  <p className="text-gray-300 text-xs mt-1">{formatDateTime(notif.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
