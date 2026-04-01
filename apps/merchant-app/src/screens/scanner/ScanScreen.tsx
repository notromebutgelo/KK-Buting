import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import QRFrame from '../../components/QRFrame'
import StatusBanner from '../../components/StatusBanner'
import { getMerchantProfile } from '../../services/merchantWorkspace.service'
import { scanMemberQr } from '../../services/transaction.service'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useAuthStore } from '../../store/authStore'
import type { MerchantProfile } from '../../types/merchant'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>()
  const user = useAuthStore((state) => state.user)
  const [permission, requestPermission] = useCameraPermissions()
  const [token, setToken] = useState('')
  const [amountSpent, setAmountSpent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cameraReady, setCameraReady] = useState(true)
  const [profile, setProfile] = useState<MerchantProfile | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true

      void getMerchantProfile(user).then((merchantProfile) => {
        if (active) {
          setProfile(merchantProfile)
          setCameraReady(true)
        }
      })

      return () => {
        active = false
      }
    }, [user])
  )

  const pointsPreview = useMemo(() => {
    const numericAmount = Number(amountSpent || 0)
    if (!numericAmount) return 10
    if (!profile?.pointsRate) return 0
    return Math.max(1, Math.floor(numericAmount / profile.pointsRate))
  }, [amountSpent, profile?.pointsRate])

  const processToken = async (rawToken: string) => {
    if (!rawToken.trim()) {
      Alert.alert('Missing QR value', 'Paste a QR token or scan a member QR code.')
      return
    }

    if (profile?.status && profile.status !== 'active') {
      Alert.alert('Scanning locked', profile.adminNote)
      return
    }

    const numericAmount = Number(amountSpent || 0)

    try {
      setIsSubmitting(true)
      const response = await scanMemberQr({
        user,
        token: rawToken.trim(),
        amountSpent: Number.isFinite(numericAmount) ? numericAmount : 0,
      })
      navigation.navigate('ScanSuccess', {
        points: response.transaction.pointsAwarded,
        memberLabel: response.transaction.memberLabel,
        memberIdMasked: response.transaction.memberIdMasked,
        amountSpent: response.transaction.amountSpent,
      })
      setToken('')
      setAmountSpent('')
    } catch (error) {
      navigation.navigate('ScanFailed', {
        message: error instanceof Error ? error.message : 'Scan failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isSubmitting || !cameraReady) return
    setCameraReady(false)
    void processToken(data)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scan Member QR</Text>
        <Text style={styles.subtitle}>
          Scan a youth QR to award points immediately. Enter a purchase amount only when you want points to follow your
          merchant peso-to-point rate.
        </Text>

        {profile ? <StatusBanner status={profile.status} message={profile.adminNote} /> : null}

        <View style={styles.cameraShell}>
          {permission?.granted ? (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                active={cameraReady}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={profile?.status === 'active' ? handleBarcodeScanned : undefined}
              />
              <View pointerEvents="none" style={styles.frameOverlay}>
                <QRFrame />
              </View>
            </>
          ) : (
            <View style={styles.permissionCard}>
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionBody}>
                Allow camera access so merchants can scan youth QR passes directly from this screen.
              </Text>
              <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
                <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Purchase amount in pesos (optional)</Text>
          <TextInput
            style={styles.input}
            value={amountSpent}
            onChangeText={setAmountSpent}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.previewText}>
            {Number(amountSpent || 0) > 0
              ? `Local preview: around ${pointsPreview} point${pointsPreview === 1 ? '' : 's'} at a ${
                  profile?.pointsRate ?? 50
                }-peso rate.`
              : `No amount entered: scanning awards the default ${pointsPreview} points.`}
          </Text>

          <Text style={styles.label}>Manual QR token entry</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            multiline
            placeholder="Paste the scanned QR payload here"
            placeholderTextColor="#94a3b8"
          />

          <Pressable style={styles.button} onPress={() => void processToken(token)} disabled={isSubmitting}>
            <Text style={styles.buttonText}>{isSubmitting ? 'Processing...' : 'Validate Scan'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => setCameraReady(true)}>
            <Text style={styles.secondaryButtonText}>Reset Scanner</Text>
          </Pressable>
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
    gap: 18,
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
  cameraShell: {
    height: 320,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  permissionBody: {
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#14b8a6',
  },
  permissionButtonText: {
    color: '#042f2e',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    color: '#111827',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  previewText: {
    color: '#64748b',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff7ed',
  },
  secondaryButtonText: {
    color: '#c2410c',
    fontWeight: '800',
    fontSize: 15,
  },
})
