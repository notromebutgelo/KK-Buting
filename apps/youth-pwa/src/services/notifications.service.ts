import api from '@/lib/api'

export type YouthNotification = {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
  link?: string | null
}

function mapNotification(item: Record<string, unknown>): YouthNotification {
  return {
    id: String(item.id || ''),
    title: String(item.title || 'Notification'),
    body: String(item.body || ''),
    type: String(item.type || 'info'),
    read: Boolean(item.read),
    createdAt: String(item.createdAt || new Date().toISOString()),
    link: item.link ? String(item.link) : null,
  }
}

export async function getMyNotifications() {
  const res = await api.get('/notifications/me')
  const notifications = (res.data?.notifications || res.data || []) as Array<Record<string, unknown>>
  return notifications.map(mapNotification)
}

export async function markMyNotificationsRead() {
  await api.post('/notifications/me/read-all')
}
