import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import StatusBadge from '../../components/StatusBadge'
import { signOut } from '../../services/auth.service'
import { getMerchantProfile } from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { MerchantProfile } from '../../types/merchant'

export default function ProfileScreen() {
  const navigation = useNavigation<any>()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [profile, setProfile] = useState<MerchantProfile | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      void getMerchantProfile(user).then((merchantProfile) => {
        if (active) {
          setProfile(merchantProfile)
        }
      })

      return () => {
        active = false
      }
    }, [user])
  )

  const handleLogout = async () => {
    try {
      await signOut()
      await logout()
    } catch {
      Alert.alert('Logout failed', 'Please try again.')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account-tie" size={34} color="#014384" />
          </View>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.name}>{profile?.businessName ?? user?.UserName ?? 'Merchant User'}</Text>
          <Text style={styles.subtitle}>Your merchant identity, account controls, and quick workspace shortcuts.</Text>
          {profile ? <StatusBadge status={profile.status} /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <DetailRow icon="storefront-outline" label="Owner" value={profile?.ownerName ?? user?.UserName ?? 'Merchant Owner'} />
          <DetailRow icon="email-outline" label="Email" value={user?.email ?? 'No email available'} />
          <DetailRow icon="shield-account-outline" label="Role" value={user?.role ?? 'merchant'} />
          <DetailRow icon="cash-multiple" label="Points rate" value={`PHP ${profile?.pointsRate ?? 10} = 1 point`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace shortcuts</Text>
          <View style={styles.actionGrid}>
            <ShortcutCard icon="storefront-outline" label="Open My Shop" onPress={() => navigation.navigate('Shop')} />
            <ShortcutCard icon="history" label="Transactions" onPress={() => navigation.navigate('Transactions')} />
            <ShortcutCard icon="food-outline" label="Products" onPress={() => navigation.navigate('Products')} />
            <ShortcutCard icon="ticket-percent-outline" label="Promotions" onPress={() => navigation.navigate('Promotions')} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security & support</Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <MaterialCommunityIcons name="shield-key-outline" size={18} color="#014384" />
            <Text style={styles.secondaryButtonText}>Change Password In App</Text>
          </Pressable>

          <View style={styles.notice}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#9c6500" />
            <Text style={styles.noticeText}>
              Merchant passwords are updated inside the app. If you no longer know the current password, ask the
              superadmin to issue a new temporary password for this account.
            </Text>
          </View>

          <Text style={styles.supportCopy}>
            Need account help? Contact SK Buting admin for approval, suspension, or merchant-policy concerns.
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
  value: string
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons name={icon} size={18} color="#014384" />
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  )
}

function ShortcutCard({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
  onPress: () => void
}) {
  return (
    <Pressable style={styles.shortcutCard} onPress={onPress}>
      <View style={styles.shortcutIcon}>
        <MaterialCommunityIcons name={icon} size={22} color="#014384" />
      </View>
      <Text style={styles.shortcutText}>{label}</Text>
    </Pressable>
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
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#014384',
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0572dc',
  },
  subtitle: {
    color: '#60748f',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#014384',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: '#7d91aa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: '#35506d',
    fontSize: 14,
    lineHeight: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  shortcutText: {
    color: '#014384',
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: '#eef4fb',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#014384',
    fontWeight: '800',
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    backgroundColor: '#fff4d8',
    borderRadius: 18,
    padding: 15,
  },
  noticeText: {
    color: '#8b6a1f',
    lineHeight: 20,
    flex: 1,
  },
  supportCopy: {
    color: '#60748f',
    lineHeight: 20,
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#014384',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
})
