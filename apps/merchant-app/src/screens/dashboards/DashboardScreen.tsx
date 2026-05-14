import React, { useCallback, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import StatCard from '../../components/StatCard'
import TransactionCard from '../../components/TransactionCard'
import { getMerchantDashboardSnapshot } from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { MerchantDashboardSnapshot, MerchantStatus } from '../../types/merchant'
import { getStatusLabel, getStatusMessage } from '../../utils/merchant'

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
    'Serving delicious products, building youth trust, and keeping your merchant workspace ready for every QR transaction.'
  const brandInitials = getInitials(brandName)
  const recentTransactions = snapshot?.recentTransactions || []
  const unreadAlerts = snapshot?.unreadNotificationCount ?? 0
  const greeting = getGreeting()
  const statusCopy = profile?.adminNote?.trim() || getStatusMessage(profile?.status || 'active')
  const statusTone = getStatusTone(profile?.status || 'active')
  const activePromoLabel =
    snapshot?.spotlightPromotion?.valueLabel || `${snapshot?.activePromotionCount ?? 0} active promo${snapshot?.activePromotionCount === 1 ? '' : 's'}`

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <View style={styles.topHeaderIdentity}>
            <View style={styles.headerLogoWrap}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.headerLogoImage} />
              ) : (
                <View style={styles.headerLogoFallback}>
                  <Text style={styles.headerLogoFallbackText}>{brandInitials}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerCopyBlock}>
              <Text style={styles.headerGreeting}>{greeting},</Text>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerMerchantName} numberOfLines={1}>
                  {brandName}
                </Text>
                {profile ? (
                  <View style={[styles.headerStatusPill, { backgroundColor: statusTone.pillBackground }]}>
                    <View style={[styles.headerStatusDot, { backgroundColor: statusTone.dotColor }]} />
                    <Text style={[styles.headerStatusText, { color: statusTone.textColor }]}>
                      {getStatusLabel(profile.status)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.headerSubtitle}>Merchant Workspace</Text>
            </View>
          </View>

          <Pressable style={styles.notificationButton} onPress={() => navigation.navigate('Alerts')}>
            <MaterialCommunityIcons name="bell-outline" size={28} color="#0a5fd8" />
            {unreadAlerts > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadAlerts > 9 ? '9+' : unreadAlerts}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureGlowPrimary} />
          <View style={styles.featureGlowSecondary} />
          <View style={styles.featureGlowTertiary} />

          <View style={styles.featureHeader}>
            <View style={styles.featureLogoWrap}>
              {profile?.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.featureLogoImage} />
              ) : (
                <View style={styles.featureLogoFallback}>
                  <Text style={styles.featureLogoFallbackText}>{brandInitials}</Text>
                </View>
              )}
            </View>

            <Text style={styles.featureCopy}>{heroCopy}</Text>
          </View>

          <View style={styles.featureMetricsRow}>
            <FeatureMetricCard
              label="This month"
              value={String(snapshot?.transactionsThisMonth ?? 0)}
              suffix="Transactions"
            />
            <FeatureMetricCard
              label="Active promos"
              value={String(snapshot?.activePromotionCount ?? 0)}
              suffix={snapshot?.activePromotionCount === 1 ? 'Promotion' : 'Promotions'}
            />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label="Scans today"
              value={String(snapshot?.scansToday ?? 0)}
              caption="Successful scans"
              icon="qrcode-scan"
              iconColor="#0a5fd8"
              iconBackground="#eef4ff"
            />
            <StatCard
              label="Points today"
              value={String(snapshot?.approvedPointsToday ?? 0)}
              caption="Points issued"
              icon="star-circle-outline"
              iconColor="#e29b00"
              iconBackground="#fff6df"
              valueColor="#b77900"
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label="Monthly txns"
              value={String(snapshot?.transactionsThisMonth ?? 0)}
              caption="This month"
              icon="chart-line"
              iconColor="#16a34a"
              iconBackground="#e8f9ee"
              valueColor="#0d7a34"
            />
            <StatCard
              label="Unread alerts"
              value={String(unreadAlerts)}
              caption="View alerts"
              icon="bell-outline"
              iconColor="#f43f5e"
              iconBackground="#fff0f3"
              valueColor="#d9264c"
            />
          </View>
        </View>

        <Pressable style={styles.statusInfoCard} onPress={() => navigation.navigate('Shop')}>
          <View style={[styles.statusInfoIconWrap, { backgroundColor: statusTone.iconBackground }]}>
            <MaterialCommunityIcons
              name={getStatusCardIcon(profile?.status || 'active')}
              size={28}
              color={statusTone.iconColor}
            />
          </View>
          <View style={styles.statusInfoCopyBlock}>
            <Text style={styles.statusInfoTitle}>{statusCopy}</Text>
          </View>
          <View style={styles.statusInfoAction}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#0a5fd8" />
          </View>
        </Pressable>

        <View style={styles.transactionsShell}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable style={styles.historyButton} onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.historyButtonText}>View all</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#0a5fd8" />
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

function FeatureMetricCard({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix: string
}) {
  return (
    <View style={styles.featureMetricCard}>
      <Text style={styles.featureMetricLabel}>{label}</Text>
      <View style={styles.featureMetricValueRow}>
        <Text style={styles.featureMetricValue}>{value}</Text>
        <Text style={styles.featureMetricSuffix}>{suffix}</Text>
      </View>
    </View>
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

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getStatusTone(status: MerchantStatus) {
  if (status === 'pending') {
    return {
      pillBackground: '#fff7df',
      dotColor: '#e6a100',
      textColor: '#9c6500',
      iconBackground: '#fff6df',
      iconColor: '#e6a100',
    }
  }

  if (status === 'suspended') {
    return {
      pillBackground: '#fff0f3',
      dotColor: '#f43f5e',
      textColor: '#cc284a',
      iconBackground: '#fff0f3',
      iconColor: '#f43f5e',
    }
  }

  return {
    pillBackground: '#e8f9ee',
    dotColor: '#16a34a',
    textColor: '#19934b',
    iconBackground: '#eef4ff',
    iconColor: '#0a5fd8',
  }
}

function getStatusCardIcon(status: MerchantStatus) {
  if (status === 'pending') return 'clock-outline'
  if (status === 'suspended') return 'alert-circle-outline'
  return 'storefront-outline'
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  topHeaderIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerLogoWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 6,
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  headerLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#ffffff',
  },
  headerLogoFallback: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014384',
  },
  headerLogoFallbackText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerCopyBlock: {
    flex: 1,
    gap: 4,
  },
  headerGreeting: {
    color: '#60748f',
    fontSize: 15,
    lineHeight: 21,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerMerchantName: {
    flexShrink: 1,
    color: '#014384',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 31,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  headerStatusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#60748f',
    fontSize: 14,
    lineHeight: 20,
  },
  notificationButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#ff405e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  featureCard: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0454b8',
    padding: 22,
    gap: 18,
    shadowColor: '#014384',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  featureGlowPrimary: {
    position: 'absolute',
    top: -18,
    right: -24,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  featureGlowSecondary: {
    position: 'absolute',
    bottom: -54,
    right: 36,
    width: 132,
    height: 132,
    borderRadius: 999,
    backgroundColor: 'rgba(5, 114, 220, 0.24)',
  },
  featureGlowTertiary: {
    position: 'absolute',
    top: 42,
    right: -12,
    width: 118,
    height: 118,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureLogoWrap: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 8,
  },
  featureLogoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  featureLogoFallback: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a4ca0',
  },
  featureLogoFallbackText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  featureCopy: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '500',
    paddingTop: 6,
  },
  featureMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureMetricCard: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureMetricLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  featureMetricValueRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  featureMetricValue: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44,
  },
  featureMetricSuffix: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  statsGrid: {
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statusInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  statusInfoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfoCopyBlock: {
    flex: 1,
  },
  statusInfoTitle: {
    color: '#014384',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 28,
  },
  statusInfoAction: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4ff',
  },
  transactionsShell: {
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#014384',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  historyButtonText: {
    color: '#0a5fd8',
    fontWeight: '800',
    fontSize: 14,
  },
  list: {
    borderRadius: 28,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
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
