import React, { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import StatusBadge from '../../components/StatusBadge'
import { getMerchantProfile } from '../../services/merchantWorkspace.service'
import { resetPassword, signOut } from '../../services/auth.service'
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.name}>{profile?.businessName ?? user?.UserName ?? 'Merchant User'}</Text>
          {profile ? <StatusBadge status={profile.status} /> : null}
          <Text style={styles.meta}>Owner: {profile?.ownerName ?? user?.UserName ?? 'Merchant Owner'}</Text>
          <Text style={styles.meta}>Email: {user?.email ?? 'No email available'}</Text>
          <Text style={styles.meta}>Role: {user?.role ?? 'merchant'}</Text>
          <Text style={styles.meta}>Points rate: PHP {profile?.pointsRate ?? 50} = 1 point</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.secondaryButtonText}>Open My Shop</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.secondaryButtonText}>Open Transaction History</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.secondaryButtonText}>Open Products</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security & Support</Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              if (!user?.email) {
                Alert.alert('Missing email', 'No account email is available for password reset.')
                return
              }

              try {
                await resetPassword(user.email)
                Alert.alert('Password reset sent', 'Check your email for the Firebase password reset link.')
              } catch {
                Alert.alert('Reset failed', 'Please try again.')
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Send Password Reset Email</Text>
          </Pressable>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>Need admin help? Contact SK Buting admin for account approval, suspension, or policy concerns.</Text>
          </View>
        </View>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f766e',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    color: '#4b5563',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#c2410c',
    fontWeight: '800',
  },
  notice: {
    marginTop: 10,
    backgroundColor: '#fff7ed',
    borderRadius: 18,
    padding: 16,
  },
  noticeText: {
    color: '#9a3412',
    lineHeight: 20,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#111827',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
})
