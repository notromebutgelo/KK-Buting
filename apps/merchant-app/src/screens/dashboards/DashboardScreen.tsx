import React, { useCallback, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import StatusBanner from '../../components/StatusBanner'
import TransactionCard from '../../components/TransactionCard'
import { getMerchantDashboardSnapshot } from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
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
  const brandName = profile?.businessName ?? user?.UserName ?? 'Merchant'
  const heroCopy =
    profile?.shortDescription ||
    "Your merchant workspace for QR scans, youth rewards activity, and storefront performance."
  const brandInitials = getInitials(brandName)
  const recentTransactions = snapshot?.recentTransactions || []
  const activePromoLabel =
    snapshot?.spotlightPromotion?.valueLabel || `${snapshot?.activePromotionCount ?? 0} active promo${snapshot?.activePromotionCount === 1 ? '' : 's'}`

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowBlue} />
          <View style={styles.heroGlowGold} />

          <View style={styles.heroHeader}>
            <View style={styles.heroCopyBlock}>
              <Text style={styles.eyebrow}>SK Merchant Workspace</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {brandName}
              </Text>
              <Text style={styles.heroSubtitle}>{heroCopy}</Text>
            </View>
            {profile ? <StatusBadge status={profile.status} /> : null}
          </View>

          <View style={styles.heroBrandRow}>
            <View style={styles.logoWrap}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoFallback}>
                  <Text style={styles.logoFallbackText}>{brandInitials}</Text>
                </View>
              )}
            </View>

            <View style={styles.heroMeta}>
              <View style={styles.metaPill}>
                <Text style={styles.metaLabel}>This month</Text>
                <Text style={styles.metaValue}>{snapshot?.transactionsThisMonth ?? 0} txns</Text>
              </View>
              <View style={[styles.metaPill, styles.metaPillWarm]}>
                <Text style={[styles.metaLabel, styles.metaLabelWarm]}>Active promos</Text>
                <Text style={[styles.metaValue, styles.metaValueWarm]}>{snapshot?.activePromotionCount ?? 0}</Text>
              </View>
            </View>
          </View>

          {profile ? <StatusBanner status={profile.status} message={profile.adminNote} /> : null}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="Scans today" value={String(snapshot?.scansToday ?? 0)} caption="Successful QR validations" />
            <StatCard
              label="Points today"
              value={String(snapshot?.approvedPointsToday ?? 0)}
              caption="Approved member points"
              tone="neutral"
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Monthly txns"
              value={String(snapshot?.transactionsThisMonth ?? 0)}
              caption="Recorded successful purchases"
            />
            <StatCard
              label="Unread alerts"
              value={String(snapshot?.unreadNotificationCount ?? 0)}
              caption="Admin and system updates"
              tone="neutral"
            />
          </View>
        </View>

        {snapshot?.spotlightPromotion ? (
          <View style={styles.spotlightCard}>
            <View style={styles.spotlightHeader}>
              <View>
                <Text style={styles.spotlightEyebrow}>Featured Promo</Text>
                <Text style={styles.spotlightTitle}>{snapshot.spotlightPromotion.title}</Text>
              </View>
              <View style={styles.spotlightBadge}>
                <Text style={styles.spotlightBadgeText}>{snapshot.spotlightPromotion.valueLabel}</Text>
              </View>
            </View>
            {snapshot.spotlightPromotion.shortTagline ? (
              <Text style={styles.spotlightCopy}>{snapshot.spotlightPromotion.shortTagline}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.transactionsShell}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <Text style={styles.sectionCopy}>Latest successful and failed scans in your workspace.</Text>
            </View>
            <Pressable style={styles.historyButton} onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.historyButtonText}>View all</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((item) => <TransactionCard key={item.id} item={item} />)
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptyBody}>
                  Once you start scanning youth QR codes, the latest activity will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footerCard}>
          <View style={styles.footerHeader}>
            <View>
              <Text style={styles.footerEyebrow}>Storefront Pulse</Text>
              <Text style={styles.footerTitle}>Keep your merchant page fresh</Text>
            </View>
            <View style={styles.footerBadge}>
              <Text style={styles.footerBadgeText}>SK Buting</Text>
            </View>
          </View>

          <View style={styles.footerMetrics}>
            <FooterMetric
              icon="cash-marker"
              label="Points rule"
              value="10 pts / PHP 100"
            />
            <FooterMetric
              icon="ticket-percent-outline"
              label="Promo highlight"
              value={activePromoLabel}
            />
          </View>

          <View style={styles.footerNote}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#9c6500" />
            <Text style={styles.footerCopy}>
              Update your banner, promo content, and storefront copy regularly so youth members always see an active, trustworthy shop presence.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function FooterMetric({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
  value: string
}) {
  return (
    <View style={styles.footerMetricCard}>
      <View style={styles.footerMetricIcon}>
        <MaterialCommunityIcons name={icon} size={18} color="#014384" />
      </View>
      <Text style={styles.footerMetricLabel}>{label}</Text>
      <Text style={styles.footerMetricValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

function getInitials(value: string) {
  const parts = String(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (!parts.length) return 'M'
  return parts.map((part) => part[0]?.toUpperCase() || '').join('')
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroGlowBlue: {
    position: 'absolute',
    top: -34,
    right: -20,
    width: 148,
    height: 148,
    borderRadius: 999,
    backgroundColor: 'rgba(5, 114, 220, 0.13)',
  },
  heroGlowGold: {
    position: 'absolute',
    bottom: -50,
    left: -14,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(252, 179, 21, 0.14)',
  },
  heroHeader: {
    gap: 14,
  },
  heroCopyBlock: {
    gap: 8,
  },
  eyebrow: {
    color: '#0572dc',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#014384',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  heroSubtitle: {
    color: '#60748f',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: '92%',
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#eef4fb',
    padding: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#ffffff',
  },
  logoFallback: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014384',
  },
  logoFallbackText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  heroMeta: {
    flex: 1,
    gap: 10,
  },
  metaPill: {
    borderRadius: 18,
    backgroundColor: '#eef4fb',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  metaPillWarm: {
    backgroundColor: '#fff6df',
  },
  metaLabel: {
    color: '#6a7f98',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metaLabelWarm: {
    color: '#8d712a',
  },
  metaValue: {
    color: '#014384',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  metaValueWarm: {
    color: '#9c6500',
  },
  statsGrid: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  spotlightCard: {
    borderRadius: 24,
    backgroundColor: '#014384',
    padding: 18,
    gap: 10,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  spotlightEyebrow: {
    color: '#a7d0ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  spotlightTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  spotlightBadge: {
    borderRadius: 999,
    backgroundColor: '#fcb315',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  spotlightBadgeText: {
    color: '#014384',
    fontSize: 12,
    fontWeight: '900',
  },
  spotlightCopy: {
    color: '#d6e8fb',
    fontSize: 14,
    lineHeight: 20,
  },
  transactionsShell: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#014384',
  },
  sectionCopy: {
    marginTop: 4,
    color: '#6a7f98',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 220,
  },
  historyButton: {
    borderRadius: 999,
    backgroundColor: '#eef4fb',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  historyButtonText: {
    color: '#014384',
    fontWeight: '800',
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: '#f8fbff',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  emptyTitle: {
    color: '#014384',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyBody: {
    marginTop: 6,
    color: '#60748f',
    lineHeight: 20,
    fontSize: 13,
  },
  footerCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  footerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  footerEyebrow: {
    color: '#0572dc',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  footerBadge: {
    borderRadius: 999,
    backgroundColor: '#eef4fb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerBadgeText: {
    color: '#014384',
    fontSize: 11,
    fontWeight: '900',
  },
  footerTitle: {
    color: '#014384',
    fontSize: 16,
    fontWeight: '900',
  },
  footerMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  footerMetricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  footerMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMetricLabel: {
    color: '#7d91aa',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  footerMetricValue: {
    color: '#014384',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  footerNote: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#fff4d8',
    padding: 14,
  },
  footerCopy: {
    flex: 1,
    color: '#8b6a1f',
    fontSize: 13,
    lineHeight: 20,
  },
})
