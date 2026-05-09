import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import QRFrame from '../../components/QRFrame'
import ScannerNoticeModal from '../../components/ScannerNoticeModal'
import StatusBanner from '../../components/StatusBanner'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { getMerchantProfile } from '../../services/merchantWorkspace.service'
import { scanMemberQr } from '../../services/transaction.service'
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
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false)
  const scanLockRef = useRef(false)
  const lastHandledTokenRef = useRef<string | null>(null)
  const pesosPerPoint = 10

  useFocusEffect(
    useCallback(() => {
      let active = true

      void getMerchantProfile(user).then((merchantProfile) => {
        if (active) {
          setProfile(merchantProfile)
          setCameraReady(true)
          scanLockRef.current = false
        }
      })

      return () => {
        active = false
      }
    }, [user])
  )

  const pointsPreview = useMemo(() => {
    const numericAmount = Number(amountSpent || 0)
    if (!numericAmount) return 0
    return Math.max(1, Math.floor(numericAmount / pesosPerPoint))
  }, [amountSpent])

  const dismissDuplicateModal = () => {
    setDuplicateModalVisible(false)
    setCameraReady(true)
    scanLockRef.current = false
  }

  const resetScannerSession = () => {
    lastHandledTokenRef.current = null
    setDuplicateModalVisible(false)
    setCameraReady(true)
    scanLockRef.current = false
  }

  const showDuplicateScanModal = () => {
    setDuplicateModalVisible(true)
    setCameraReady(false)
    scanLockRef.current = false
  }

  const isDuplicateScanToken = (rawToken: string) => {
    const normalizedToken = rawToken.trim()
    return Boolean(normalizedToken && normalizedToken === lastHandledTokenRef.current)
  }

  const isDuplicateScanError = (message: string) => {
    const normalizedMessage = message.toLowerCase()
    return (
      normalizedMessage.includes('already scanned') ||
      normalizedMessage.includes('already redeemed') ||
      normalizedMessage.includes('already used')
    )
  }

  const processToken = async (rawToken: string, source: 'camera' | 'manual' = 'manual') => {
    const normalizedToken = rawToken.trim()

    if (!normalizedToken) {
      scanLockRef.current = false
      Alert.alert('Missing QR value', 'Paste a QR token or scan a member QR code.')
      return
    }

    if (profile?.status && profile.status !== 'active') {
      scanLockRef.current = false
      Alert.alert('Scanning locked', profile.adminNote)
      return
    }

    const numericAmount = Number(amountSpent || 0)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      scanLockRef.current = false
      Alert.alert('Amount required', 'Enter the purchase amount so points can follow the PHP 100 = 10 points rule.')
      return
    }

    if (isDuplicateScanToken(normalizedToken)) {
      showDuplicateScanModal()
      return
    }

    try {
      setIsSubmitting(true)
      const response = await scanMemberQr({
        user,
        token: normalizedToken,
        amountSpent: Number.isFinite(numericAmount) ? numericAmount : 0,
      })
      lastHandledTokenRef.current = normalizedToken
      navigation.navigate('ScanSuccess', {
        points: response.transaction.pointsAwarded,
        memberLabel: response.transaction.memberLabel,
        memberIdMasked: response.transaction.memberIdMasked,
        amountSpent: response.transaction.amountSpent,
      })
      setToken('')
      setAmountSpent('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed'

      if (source === 'camera' && isDuplicateScanError(message)) {
        showDuplicateScanModal()
        return
      }

      navigation.navigate('ScanFailed', {
        message,
      })
    } finally {
      setIsSubmitting(false)
      scanLockRef.current = false
    }
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isSubmitting || !cameraReady || scanLockRef.current) return
    scanLockRef.current = true
    setCameraReady(false)
    void processToken(data, 'camera')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text style={styles.title}>Scan Member QR</Text>
          <Text style={styles.subtitle}>
            Scan a youth QR, add the purchase amount, and award points using the current rule of 10 points for every PHP 100 spent.
          </Text>

          <View style={styles.previewRow}>
            <MiniInfoCard
              icon="cash-fast"
              label="Points preview"
              value={`${pointsPreview} pt${pointsPreview === 1 ? '' : 's'}`}
            />
            <MiniInfoCard
              icon="cash-marker"
              label="Current rule"
              value="10 pts / PHP 100"
            />
          </View>
        </View>

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
              <View style={styles.permissionIcon}>
                <MaterialCommunityIcons name="camera-outline" size={28} color="#014384" />
              </View>
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
          <Text style={styles.sectionTitle}>Scan details</Text>

          <Text style={styles.label}>Purchase amount in pesos</Text>
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
              ? `Estimated reward: around ${pointsPreview} point${pointsPreview === 1 ? '' : 's'} based on PHP 10 per point, or 10 points for every PHP 100 spent.`
              : 'Enter a purchase amount to calculate points before you submit the scan using the 10-points-per-PHP-100 rule.'}
          </Text>

          <Text style={styles.label}>Manual QR token entry</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={token}
            onChangeText={setToken}
            multiline
            placeholder="Paste the scanned QR payload here"
            placeholderTextColor="#94a3b8"
          />

          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => void processToken(token, 'manual')} disabled={isSubmitting}>
              <Text style={styles.buttonText}>{isSubmitting ? 'Processing...' : 'Validate Scan'}</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={resetScannerSession}>
              <Text style={styles.secondaryButtonText}>Reset Scanner</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <ScannerNoticeModal
        visible={duplicateModalVisible}
        title="QR Already Scanned"
        message="This member QR was already scanned in the current scanner session. To avoid duplicate point awards, scan a different QR or tap Reset Scanner before trying this code again."
        onClose={dismissDuplicateModal}
      />
    </SafeAreaView>
  )
}

function MiniInfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
  value: string
}) {
  return (
    <View style={styles.infoCard}>
      <MaterialCommunityIcons name={icon} size={18} color="#014384" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
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
  previewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  infoLabel: {
    color: '#7d91aa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#014384',
    fontSize: 17,
    fontWeight: '900',
  },
  cameraShell: {
    height: 300,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0c3e74',
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
    backgroundColor: '#ffffff',
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  permissionTitle: {
    color: '#014384',
    fontSize: 20,
    fontWeight: '900',
  },
  permissionBody: {
    color: '#60748f',
    textAlign: 'center',
    lineHeight: 21,
  },
  permissionButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#014384',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#014384',
  },
  label: {
    color: '#35506d',
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0f172a',
    backgroundColor: '#f8fbff',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  previewText: {
    color: '#7d91aa',
    lineHeight: 20,
  },
  buttonRow: {
    gap: 10,
  },
  button: {
    backgroundColor: '#014384',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff4d8',
  },
  secondaryButtonText: {
    color: '#9c6500',
    fontWeight: '800',
    fontSize: 15,
  },
})
