import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import {
  getMerchantNotifications,
  markAllNotificationsRead,
} from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { MerchantNotification } from '../../types/merchant'
import { formatDateTime } from '../../utils/merchant'

type NotificationFilter = 'all' | 'unread'

export default function NotificationsScreen() {
  const user = useAuthStore((state) => state.user)
  const [notifications, setNotifications] = useState<MerchantNotification[]>([])
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const items = await getMerchantNotifications(user)
      setNotifications(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [user])

  const visibleNotifications =
    filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroAccentRow}>
            <View style={[styles.swatch, { backgroundColor: '#014384' }]} />
            <View style={[styles.swatch, { backgroundColor: '#0572dc' }]} />
            <View style={[styles.swatch, { backgroundColor: '#fcb315' }]} />
          </View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Merchant alerts, admin notices, and transaction updates in one place.</Text>

          <View style={styles.toolbar}>
            <View style={styles.filterRow}>
              {(['all', 'unread'] as NotificationFilter[]).map((item) => (
                <Pressable
                  key={item}
                  style={[styles.filterChip, filter === item && styles.activeChip]}
                  onPress={() => setFilter(item)}
                >
                  <Text style={[styles.filterText, filter === item && styles.activeChipText]}>{item}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.markReadButton, isMarkingRead && styles.markReadButtonDisabled]}
              disabled={isMarkingRead || notifications.every((notification) => notification.read)}
              onPress={async () => {
                try {
                  setIsMarkingRead(true)
                  await markAllNotificationsRead(user)
                  await loadNotifications()
                } finally {
                  setIsMarkingRead(false)
                }
              }}
            >
              <Text style={styles.markReadText}>{isMarkingRead ? 'Updating...' : 'Mark all read'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.list}>
          {isLoading ? (
            <StateCard
              icon="bell-ring-outline"
              title="Loading notifications..."
              body="Pulling your latest merchant updates from the server."
            />
          ) : error ? (
            <View style={styles.errorState}>
              <StateCard
                icon="alert-circle-outline"
                title="Could not load notifications"
                body={error}
                tone="error"
              />
              <Pressable style={styles.retryButton} onPress={() => void loadNotifications()}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            visibleNotifications.map((notification) => (
              <View key={notification.id} style={[styles.card, !notification.read && styles.unreadCard]}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons
                    name={notification.read ? 'bell-outline' : 'bell-ring-outline'}
                    size={20}
                    color={notification.read ? '#6a7f98' : '#014384'}
                  />
                </View>
                <View style={styles.cardBodyWrap}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{notification.title}</Text>
                    {!notification.read ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.cardBody}>{notification.body}</Text>
                  <Text style={styles.cardMeta}>{formatDateTime(notification.createdAt)}</Text>
                </View>
              </View>
            ))
          )}

          {!isLoading && !error && visibleNotifications.length === 0 ? (
            <StateCard
              icon="bell-off-outline"
              title="No notifications here"
              body="Admin updates, account notices, and transaction messages will show up here."
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function StateCard({
  icon,
  title,
  body,
  tone = 'default',
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  title: string
  body: string
  tone?: 'default' | 'error'
}) {
  return (
    <View style={[styles.emptyState, tone === 'error' && styles.emptyStateError]}>
      <View style={[styles.stateIconWrap, tone === 'error' && styles.stateIconWrapError]}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={tone === 'error' ? '#c2410c' : '#014384'}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 18,
    gap: 14,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  heroAccentRow: {
    flexDirection: 'row',
    gap: 7,
  },
  swatch: {
    width: 26,
    height: 8,
    borderRadius: 999,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#014384',
  },
  subtitle: {
    color: '#60748f',
    lineHeight: 21,
  },
  toolbar: {
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#eef4fb',
  },
  activeChip: {
    backgroundColor: '#014384',
  },
  filterText: {
    color: '#4f647e',
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  activeChipText: {
    color: '#ffffff',
  },
  markReadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#fff4d8',
  },
  markReadButtonDisabled: {
    opacity: 0.6,
  },
  markReadText: {
    color: '#9c6500',
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 15,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadCard: {
    borderColor: 'rgba(1, 67, 132, 0.2)',
    backgroundColor: '#f8fbff',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBodyWrap: {
    flex: 1,
    gap: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    color: '#014384',
    fontWeight: '800',
    flex: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#fcb315',
  },
  cardBody: {
    color: '#5e728b',
    lineHeight: 19,
  },
  cardMeta: {
    color: '#7d91aa',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  emptyStateError: {
    backgroundColor: '#fff9f1',
    borderColor: 'rgba(252, 186, 44, 0.4)',
  },
  stateIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  stateIconWrapError: {
    backgroundColor: '#fff1de',
  },
  errorState: {
    gap: 10,
  },
  emptyTitle: {
    color: '#014384',
    fontWeight: '800',
  },
  emptyBody: {
    color: '#60748f',
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  retryText: {
    color: '#9c6500',
    fontWeight: '800',
  },
})
