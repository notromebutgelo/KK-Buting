import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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

  const loadNotifications = async () => {
    const items = await getMerchantNotifications(user)
    setNotifications(items)
  }

  useEffect(() => {
    void loadNotifications()
  }, [user])

  const visibleNotifications =
    filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Merchant alerts, admin notices, and transaction updates.</Text>
        </View>

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
            style={styles.markReadButton}
            onPress={async () => {
              await markAllNotificationsRead(user)
              await loadNotifications()
            }}
          >
            <Text style={styles.markReadText}>Mark all read</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {visibleNotifications.map((notification) => (
            <View key={notification.id} style={[styles.card, !notification.read && styles.unreadCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                {!notification.read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.cardBody}>{notification.body}</Text>
              <Text style={styles.cardMeta}>{formatDateTime(notification.createdAt)}</Text>
            </View>
          ))}

          {visibleNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No notifications here</Text>
              <Text style={styles.emptyBody}>New merchant alerts will appear once the notification modules are wired.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6ef',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    lineHeight: 22,
  },
  toolbar: {
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  activeChip: {
    backgroundColor: '#0f766e',
  },
  filterText: {
    color: '#334155',
    fontWeight: '700',
  },
  activeChipText: {
    color: '#ffffff',
  },
  markReadButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fff7ed',
  },
  markReadText: {
    color: '#c2410c',
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unreadCard: {
    borderColor: '#99f6e4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    color: '#111827',
    fontWeight: '800',
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#0f766e',
  },
  cardBody: {
    color: '#4b5563',
    lineHeight: 20,
  },
  cardMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: {
    color: '#111827',
    fontWeight: '800',
  },
  emptyBody: {
    color: '#64748b',
    lineHeight: 20,
  },
})
