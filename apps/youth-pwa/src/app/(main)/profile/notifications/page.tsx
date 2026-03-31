'use client'
import PageHeader from '@/components/layout/PageHeader'

const mockNotifications = [
  {
    id: 1,
    title: 'Profile Submitted',
    message: 'Your profiling form has been submitted for review.',
    time: '2 hours ago',
    read: false,
    type: 'info',
  },
  {
    id: 2,
    title: 'Welcome to KK!',
    message: 'You have successfully registered. Complete your profile to get started.',
    time: '1 day ago',
    read: true,
    type: 'success',
  },
]

const typeColors: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
}

export default function NotificationsPage() {
  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Notifications" />
      <div className="px-5 pt-4 space-y-3">
        {mockNotifications.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-400 font-medium">No notifications yet</p>
            <p className="text-gray-300 text-sm mt-1">We&apos;ll notify you about important updates</p>
          </div>
        ) : (
          mockNotifications.map((notif) => (
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
                    {!notif.read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">{notif.message}</p>
                  <p className="text-gray-300 text-xs mt-1">{notif.time}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
