import React, { useState } from 'react'
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
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { changePassword, resetPassword, signOut } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'

export default function ForcePasswordChangeScreen() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)
  const logout = useAuthStore((state) => state.logout)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Fill in your current password and your new password.')
      return
    }

    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Your new password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Confirm your new password exactly to continue.')
      return
    }

    if (currentPassword === newPassword) {
      Alert.alert('Choose a different password', 'Your new password must be different from the temporary password provided by the superadmin.')
      return
    }

    try {
      setSubmitting(true)
      const payload = await changePassword(currentPassword, newPassword)
      setToken(payload.token)
      setUser(payload.user)
      Alert.alert('Password updated', 'Your password has been changed. You can now access the merchant workspace.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password.'
      Alert.alert('Password change failed', message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      await logout()
    } catch {
      Alert.alert('Sign out failed', 'Please try again.')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="shield-key-outline" size={34} color="#014384" />
            </View>
            <Text style={styles.title}>Change Temporary Password</Text>
            <Text style={styles.subtitle}>
              This merchant account is still using the password created by the superadmin. Change it now before continuing.
            </Text>
            <View style={styles.infoPill}>
              <MaterialCommunityIcons name="email-outline" size={16} color="#014384" />
              <Text style={styles.infoPillText}>{user?.email ?? 'Merchant account'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Set your new merchant password</Text>
            <Text style={styles.sectionCopy}>
              Use a new password that only you know. This password will be required the next time you sign in.
            </Text>

            <PasswordField
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              showPassword={showCurrentPassword}
              onToggle={() => setShowCurrentPassword((current) => !current)}
              placeholder="Enter the temporary password"
            />

            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              showPassword={showNewPassword}
              onToggle={() => setShowNewPassword((current) => !current)}
              placeholder="Create a new password"
            />

            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              showPassword={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((current) => !current)}
              placeholder="Repeat your new password"
            />

            <Pressable style={styles.primaryButton} onPress={handleChangePassword} disabled={submitting}>
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Updating Password...' : 'Update Password'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Need another option?</Text>
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                if (!user?.email) {
                  Alert.alert('Missing email', 'No account email is available for password reset.')
                  return
                }

                try {
                  await resetPassword(user.email)
                  Alert.alert('Reset email sent', 'Check your inbox for the Firebase password reset email, then sign in again with your new password.')
                } catch {
                  Alert.alert('Reset failed', 'Please try again.')
                }
              }}
            >
              <MaterialCommunityIcons name="email-fast-outline" size={18} color="#014384" />
              <Text style={styles.secondaryButtonText}>Send Password Reset Email</Text>
            </Pressable>

            <Pressable style={styles.ghostButton} onPress={handleLogout}>
              <Text style={styles.ghostButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function PasswordField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  showPassword,
  onToggle,
  placeholder,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  secureTextEntry: boolean
  showPassword: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          style={styles.passwordInput}
        />
        <Pressable style={styles.passwordToggle} onPress={onToggle}>
          <MaterialCommunityIcons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#6a7f98"
          />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  title: {
    color: '#014384',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#60748f',
    fontSize: 15,
    lineHeight: 23,
  },
  infoPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#eef4fb',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  infoPillText: {
    color: '#014384',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionTitle: {
    color: '#014384',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCopy: {
    color: '#60748f',
    lineHeight: 21,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#35506d',
    fontWeight: '800',
    fontSize: 14,
  },
  passwordRow: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    backgroundColor: '#f8fbff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  passwordToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: '#014384',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
  ghostButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9e4f0',
    paddingVertical: 14,
  },
  ghostButtonText: {
    color: '#35506d',
    fontWeight: '800',
  },
})
