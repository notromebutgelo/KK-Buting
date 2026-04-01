import React, { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import StatusBanner from '../../components/StatusBanner'
import TransactionCard from '../../components/TransactionCard'
import { useAuthStore } from '../../store/authStore'
import { getMerchantDashboardSnapshot } from '../../services/merchantWorkspace.service'
import type { MerchantDashboardSnapshot } from '../../types/merchant'

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user)
  const navigation = useNavigation<any>()
  const [snapshot, setSnapshot] = useState<MerchantDashboardSnapshot | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      void getMerchantDashboardSnapshot(user).then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot)
        }
      })

      return () => {
        active = false
      }
    }, [user])
  )

  const profile = snapshot?.profile

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <Text style={styles.greeting}>Merchant Dashboard</Text>
              <Text style={styles.name}>{profile?.businessName ?? user?.UserName ?? 'Merchant'}</Text>
              <Text style={styles.subtitle}>Today&apos;s sales-side view, active promos, and scan activity at a glance.</Text>
            </View>
            {profile ? <StatusBadge status={profile.status} /> : null}
          </View>
          {profile ? <StatusBanner status={profile.status} message={profile.adminNote} /> : null}
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Scans Today" value={String(snapshot?.scansToday ?? 0)} caption="Successful QR scans" />
          <StatCard
            label="Points Today"
            value={String(snapshot?.approvedPointsToday ?? 0)}
            caption="Server-approved rewards"
            tone="neutral"
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="This Month"
            value={String(snapshot?.transactionsThisMonth ?? 0)}
            caption="Recorded transactions"
            tone="neutral"
          />
          <StatCard
            label="Unread Alerts"
            value={String(snapshot?.unreadNotificationCount ?? 0)}
            caption="Admin and system notices"
          />
        </View>

        <View style={styles.quickActions}>
          <ActionCard label="Open Scanner" copy="Start live QR scanning now." onPress={() => navigation.navigate('Scan')} />
          <ActionCard label="View History" copy="Review success and failed scans." onPress={() => navigation.navigate('Transactions')} />
          <ActionCard label="Manage Promos" copy="Create youth-facing promo cards." onPress={() => navigation.navigate('Promotions')} />
          <ActionCard label="Edit Products" copy="Update your menu and item list." onPress={() => navigation.navigate('Products')} />
        </View>

        {snapshot?.spotlightPromotion ? (
          <View style={styles.spotlight}>
            <Text style={styles.spotlightEyebrow}>Active Promotion</Text>
            <Text style={styles.spotlightTitle}>{snapshot.spotlightPromotion.title}</Text>
            <Text style={styles.spotlightValue}>{snapshot.spotlightPromotion.valueLabel}</Text>
            <Text style={styles.spotlightCopy}>{snapshot.spotlightPromotion.shortTagline}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <Pressable onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.sectionMeta}>Open full history</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {(snapshot?.recentTransactions || []).map((item) => (
            <TransactionCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

type ActionCardProps = {
  label: string
  copy: string
  onPress: () => void
}

function ActionCard({ label, copy, onPress }: ActionCardProps) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionCopy}>{copy}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6ef',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  hero: {
    backgroundColor: '#134e4a',
    padding: 22,
    borderRadius: 26,
    gap: 14,
  },
  heroTop: {
    gap: 12,
  },
  heroText: {
    gap: 8,
  },
  greeting: {
    color: '#99f6e4',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  name: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#ccfbf1',
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActions: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  actionCopy: {
    color: '#4b5563',
    lineHeight: 20,
  },
  spotlight: {
    backgroundColor: '#fff7ed',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  spotlightEyebrow: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  spotlightTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  spotlightValue: {
    color: '#ea580c',
    fontSize: 28,
    fontWeight: '900',
  },
  spotlightCopy: {
    color: '#7c2d12',
    lineHeight: 21,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sectionMeta: {
    color: '#6b7280',
    fontWeight: '600',
  },
  list: {
    gap: 12,
  },
})
