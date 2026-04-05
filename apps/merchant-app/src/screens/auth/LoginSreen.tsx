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

import { resetPassword, signIn } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'

export default function LoginSreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)
  const setLoading = useAuthStore((state) => state.setLoading)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your merchant email and password.')
      return
    }

    try {
      setSubmitting(true)
      setLoading(true)
      const payload = await signIn(email, password)
      setToken(payload.token)
      setUser(payload.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.'
      Alert.alert('Login failed', message)
    } finally {
      setSubmitting(false)
      setLoading(false)
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
          <View style={styles.hero}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="storefront-outline" size={36} color="#014384" />
            </View>
            <Text style={styles.eyebrow}>SK Barangay Buting</Text>
            <Text style={styles.title}>Merchant Console</Text>
            <Text style={styles.subtitle}>
              Sign in with an approved merchant account to scan youth QR passes and track point activity.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.notice}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#9c6500" />
              <Text style={styles.noticeText}>
                Merchant-only login. Merchant accounts are created and approved by SK admin. No in-app self-registration.
              </Text>
            </View>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="merchant@example.com"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                style={styles.passwordInput}
              />
              <Pressable style={styles.passwordToggle} onPress={() => setShowPassword((current) => !current)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#6a7f98"
                />
              </Pressable>
            </View>

            <Pressable style={styles.button} onPress={handleLogin} disabled={submitting}>
              <Text style={styles.buttonText}>{submitting ? 'Signing in...' : 'Sign In'}</Text>
            </Pressable>

            <Pressable
              style={styles.linkButton}
              onPress={async () => {
                if (!email.trim()) {
                  Alert.alert('Enter email first', 'Add your merchant email so we know where to send the reset link.')
                  return
                }

                try {
                  await resetPassword(email)
                  Alert.alert('Reset email sent', 'Check your inbox for the Firebase password reset email.')
                } catch {
                  Alert.alert('Reset failed', 'Please verify the email and try again.')
                }
              }}
            >
              <Text style={styles.linkButtonText}>Forgot password?</Text>
            </Pressable>

            <Text style={styles.caption}>
              Tip: if login succeeds in Firebase but the app still blocks you, the account likely does not have the
              merchant role yet or is still pending approval.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 28,
    gap: 10,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  eyebrow: {
    color: '#0572dc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#014384',
    fontSize: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: '#60748f',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  label: {
    color: '#35506d',
    fontWeight: '800',
    fontSize: 14,
  },
  notice: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    backgroundColor: '#fff4d8',
    padding: 14,
  },
  noticeText: {
    color: '#8b6a1f',
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fbff',
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
  button: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: '#014384',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  linkButtonText: {
    color: '#0572dc',
    fontWeight: '800',
  },
  caption: {
    marginTop: 4,
    color: '#6a7f98',
    fontSize: 13,
    lineHeight: 19,
  },
})
