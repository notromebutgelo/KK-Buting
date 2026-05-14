import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native'
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

type ScanNoticeState = {
  title: string
  message: string
  confirmLabel?: string
  secondaryLabel?: string
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  tone?: 'warning' | 'danger' | 'info'
  ignoreToken?: string | null
  secondaryAction?: 'reset' | 'resume'
}

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>()
  const isFocused = useIsFocused()
  const user = useAuthStore((state) => state.user)
  const [permission, requestPermission] = useCameraPermissions()
  const [token, setToken] = useState('')
  const [amountSpent, setAmountSpent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [scannerRequested, setScannerRequested] = useState(false)
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [profile, setProfile] = useState<MerchantProfile | null>(null)
  const [notice, setNotice] = useState<ScanNoticeState | null>(null)

  const scanLockRef = useRef(false)
  const lastSuccessfulTokenRef = useRef<string | null>(null)
  const ignoredVisibleTokenRef = useRef<string | null>(null)
  const lastCapturedTokenRef = useRef<string | null>(null)
  const lastCaptureAtRef = useRef(0)

  const pesosPerPoint = 10
  const numericAmount = Number(amountSpent || 0)
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount > 0
  const canStartScanner = hasValidAmount && !isSubmitting && profile?.status === 'active'
  const canSubmitManual = hasValidAmount && token.trim().length > 0 && !isSubmitting
  const shouldKeepScannerLive =
    scannerRequested && hasValidAmount && profile?.status === 'active' && isFocused

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
        setScannerEnabled(false)
        setNotice(null)
        scanLockRef.current = true
      }
    }, [user])
  )

  useEffect(() => {
    if (!hasValidAmount && scannerRequested) {
      setScannerRequested(false)
      setScannerEnabled(false)
      scanLockRef.current = false
    }
  }, [hasValidAmount, scannerRequested])

  useEffect(() => {
    if (!isFocused || notice) {
      setScannerEnabled(false)
      return
    }

    setScannerEnabled(shouldKeepScannerLive)
    scanLockRef.current = false
  }, [isFocused, notice, shouldKeepScannerLive])

  const pointsPreview = useMemo(() => {
    if (!numericAmount) return 0
    return Math.max(1, Math.floor(numericAmount / pesosPerPoint))
  }, [numericAmount])

  const openNotice = useCallback((nextNotice: ScanNoticeState) => {
    setNotice(nextNotice)
    setScannerEnabled(false)
    scanLockRef.current = true
  }, [])

  const resumeScanner = useCallback(
    (ignoreToken?: string | null) => {
      if (typeof ignoreToken !== 'undefined') {
        ignoredVisibleTokenRef.current = ignoreToken
      }
      setScannerEnabled(shouldKeepScannerLive)
      scanLockRef.current = false
    },
    [shouldKeepScannerLive]
  )

  const resetScannerSession = useCallback(() => {
    lastSuccessfulTokenRef.current = null
    ignoredVisibleTokenRef.current = null
    lastCapturedTokenRef.current = null
    lastCaptureAtRef.current = 0
    setNotice(null)
    setToken('')
    setAmountSpent('')
    setScannerRequested(false)
    setScannerEnabled(false)
    scanLockRef.current = false
  }, [])

  const closeScannerSession = useCallback(() => {
    ignoredVisibleTokenRef.current = null
    lastCapturedTokenRef.current = null
    lastCaptureAtRef.current = 0
    setNotice(null)
    setToken('')
    setScannerRequested(false)
    setScannerEnabled(false)
    scanLockRef.current = false
  }, [])

  const dismissNotice = useCallback(() => {
    const ignoredToken = notice?.ignoreToken ?? undefined
    setNotice(null)
    resumeScanner(ignoredToken)
  }, [notice, resumeScanner])

  const handleSecondaryNoticeAction = useCallback(() => {
    if (notice?.secondaryAction === 'reset') {
      resetScannerSession()
      return
    }

    dismissNotice()
  }, [dismissNotice, notice, resetScannerSession])

  const showScannerValidationNotice = useCallback(
    (rawToken: string, message: string) => {
      if (rawToken) {
        setToken(rawToken)
      }

      openNotice({
        title: 'Complete Scan Details',
        message,
        confirmLabel: 'Back to Scanner',
        iconName: 'cash-remove',
        tone: 'warning',
        ignoreToken: rawToken || null,
      })
    },
    [openNotice]
  )

  const showDuplicateScanNotice = useCallback(
    (rawToken: string) => {
      openNotice({
        title: 'QR Already Used',
        message:
          'This QR code has already been used. Please ask the user to refresh or generate a new QR code before trying again.',
        confirmLabel: 'Keep Scanner Active',
        secondaryLabel: 'Reset Session',
        secondaryAction: 'reset',
        iconName: 'qrcode-remove',
        tone: 'warning',
        ignoreToken: rawToken || null,
      })
    },
    [openNotice]
  )

  const showScannerErrorNotice = useCallback(
    (message: string, rawToken?: string) => {
      openNotice({
        title: 'Scan Unavailable',
        message,
        confirmLabel: 'OK',
        iconName: 'alert-circle-outline',
        tone: 'danger',
        ignoreToken: rawToken || null,
      })
    },
    [openNotice]
  )

  const isDuplicateScanToken = useCallback((rawToken: string) => {
    const normalizedToken = rawToken.trim()
    return Boolean(normalizedToken && normalizedToken === lastSuccessfulTokenRef.current)
  }, [])

  const isDuplicateScanError = useCallback((message: string) => {
    const normalizedMessage = message.toLowerCase()
    return (
      normalizedMessage.includes('already scanned') ||
      normalizedMessage.includes('already redeemed') ||
      normalizedMessage.includes('already used')
    )
  }, [])

  const prepareCameraSubmission = useCallback((rawToken: string) => {
    const normalizedToken = rawToken.trim()
    const now = Date.now()

    if (!normalizedToken) {
      return false
    }

    if (
      ignoredVisibleTokenRef.current &&
      normalizedToken === ignoredVisibleTokenRef.current
    ) {
      return false
    }

    if (
      lastCapturedTokenRef.current === normalizedToken &&
      now - lastCaptureAtRef.current < 1200
    ) {
      return false
    }

    if (
      ignoredVisibleTokenRef.current &&
      normalizedToken !== ignoredVisibleTokenRef.current
    ) {
      ignoredVisibleTokenRef.current = null
    }

    lastCapturedTokenRef.current = normalizedToken
    lastCaptureAtRef.current = now
    scanLockRef.current = true
    return true
  }, [])

  const openScannerSession = useCallback(() => {
    if (!hasValidAmount) {
      openNotice({
        title: 'Enter Purchase Amount',
        message:
          'Add a valid purchase amount greater than zero before opening the QR scanner.',
        confirmLabel: 'OK',
        iconName: 'cash-remove',
        tone: 'warning',
      })
      return
    }

    setNotice(null)
    setScannerRequested(true)
    setScannerEnabled(true)
    scanLockRef.current = false

    if (!permission?.granted) {
      void requestPermission()
    }
  }, [hasValidAmount, openNotice, permission?.granted, requestPermission])

  const handleAmountChange = useCallback((value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '')
    setAmountSpent(sanitized)
  }, [])

  const processToken = useCallback(
    async (rawToken: string, source: 'camera' | 'manual' = 'manual') => {
      const normalizedToken = rawToken.trim()
      let shouldResumeScanner = true

      if (!normalizedToken) {
        if (source === 'camera') {
          showScannerErrorNotice('Scan a valid member QR code to continue.')
        } else {
          showScannerValidationNotice('', 'Paste a QR token or scan a member QR code first.')
        }
        return
      }

      if (profile?.status && profile.status !== 'active') {
        showScannerErrorNotice(profile.adminNote, source === 'camera' ? normalizedToken : undefined)
        return
      }

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        const validationMessage =
          source === 'camera'
            ? 'Enter the purchase amount, then reopen the scanner to continue. Your captured QR payload is saved below as a fallback.'
            : 'Enter the purchase amount so points can be calculated before submitting this scan.'

        showScannerValidationNotice(source === 'camera' ? normalizedToken : token, validationMessage)
        return
      }

      if (isDuplicateScanToken(normalizedToken)) {
        showDuplicateScanNotice(normalizedToken)
        return
      }

      try {
        setIsSubmitting(true)

        const response = await scanMemberQr({
          user,
          token: normalizedToken,
          amountSpent: numericAmount,
        })

        lastSuccessfulTokenRef.current = normalizedToken
        ignoredVisibleTokenRef.current = source === 'camera' ? normalizedToken : null
        setScannerRequested(false)
        setScannerEnabled(false)
        setToken('')
        setAmountSpent('')

        navigation.navigate('ScanSuccess', {
          points: response.transaction.pointsAwarded,
          memberLabel: response.transaction.memberLabel,
          memberIdMasked: response.transaction.memberIdMasked,
          amountSpent: response.transaction.amountSpent,
        })

        shouldResumeScanner = false
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Scan failed'

        if (isDuplicateScanError(message)) {
          showDuplicateScanNotice(normalizedToken)
          shouldResumeScanner = false
          return
        }

        if (source === 'camera') {
          ignoredVisibleTokenRef.current = normalizedToken
        }

        setScannerEnabled(false)
        navigation.navigate('ScanFailed', {
          message,
        })
        shouldResumeScanner = false
      } finally {
        setIsSubmitting(false)

        if (shouldResumeScanner) {
          resumeScanner()
        } else {
          scanLockRef.current = false
        }
      }
    },
    [
      isDuplicateScanError,
      isDuplicateScanToken,
      navigation,
      numericAmount,
      profile?.adminNote,
      profile?.status,
      resumeScanner,
      showDuplicateScanNotice,
      showScannerErrorNotice,
      showScannerValidationNotice,
      token,
      user,
    ]
  )

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isSubmitting || !scannerEnabled || !isFocused || scanLockRef.current) return
    if (!prepareCameraSubmission(data)) return
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
              Start with the purchase amount, then open the scanner to award points using the
              current rule of 10 points for every PHP 100 spent.
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

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Transaction setup</Text>

            <Text style={styles.label}>Purchase amount in pesos</Text>
            <TextInput
              style={styles.input}
              value={amountSpent}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.previewText}>
              {hasValidAmount
                ? `Estimated reward: around ${pointsPreview} point${
                    pointsPreview === 1 ? '' : 's'
                  } based on PHP 10 per point, or 10 points for every PHP 100 spent.`
                : 'Enter a purchase amount greater than zero before opening the QR scanner or submitting a manual QR token.'}
            </Text>

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, !canStartScanner && styles.buttonDisabled]}
                onPress={openScannerSession}
                disabled={!canStartScanner}
              >
                <Text style={styles.buttonText}>
                  {scannerRequested ? 'Scanner Ready' : 'Open Scanner'}
                </Text>
              </Pressable>

              {scannerRequested ? (
                <Pressable style={styles.secondaryButton} onPress={closeScannerSession}>
                  <Text style={styles.secondaryButtonText}>Close Scanner</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.secondaryButton} onPress={resetScannerSession}>
                  <Text style={styles.secondaryButtonText}>Reset Session</Text>
                </Pressable>
              )}
            </View>
          </View>

          {scannerRequested ? (
            <View style={styles.cameraShell}>
              {permission?.granted ? (
                <>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    active={isFocused}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={
                      profile?.status === 'active' && scannerEnabled && isFocused
                        ? handleBarcodeScanned
                        : undefined
                    }
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
                    Allow camera access so merchants can scan youth QR passes directly from this
                    screen.
                  </Text>
                  <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
                    <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderIcon}>
                <MaterialCommunityIcons name="qrcode-scan" size={28} color="#014384" />
              </View>
              <Text style={styles.placeholderTitle}>Scanner locked until amount is ready</Text>
              <Text style={styles.placeholderBody}>
                Set the purchase amount first, then open the scanner for a single secure QR
                redemption session.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manual QR fallback</Text>

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
              <Pressable
                style={[styles.button, !canSubmitManual && styles.buttonDisabled]}
                onPress={() => void processToken(token, 'manual')}
                disabled={!canSubmitManual}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? 'Processing...' : 'Validate Scan'}
                </Text>
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={resetScannerSession}>
                <Text style={styles.secondaryButtonText}>Reset Session</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScannerNoticeModal
        visible={Boolean(notice)}
        title={notice?.title || ''}
        message={notice?.message || ''}
        confirmLabel={notice?.confirmLabel}
        secondaryLabel={notice?.secondaryLabel}
        iconName={notice?.iconName}
        tone={notice?.tone}
        onClose={dismissNotice}
        onSecondaryAction={notice?.secondaryAction ? handleSecondaryNoticeAction : undefined}
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
  placeholderCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    backgroundColor: '#ffffff',
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  placeholderIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#014384',
    textAlign: 'center',
  },
  placeholderBody: {
    color: '#60748f',
    textAlign: 'center',
    lineHeight: 21,
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
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#014384',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
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
