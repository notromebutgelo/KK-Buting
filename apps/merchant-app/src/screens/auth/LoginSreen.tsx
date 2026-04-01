import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { resetPassword, signIn } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'

export default function LoginSreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>KK SYSTEM</Text>
          <Text style={styles.title}>Merchant Console</Text>
          <Text style={styles.subtitle}>
            Sign in with an approved merchant account to scan youth QR passes and track point activity.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Merchant-only login. Merchant accounts are created and approved by SK admin. No in-app self-registration.</Text>
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
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#115e59',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 32,
    gap: 12,
  },
  eyebrow: {
    color: '#ccfbf1',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: '#d1fae5',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 28,
    padding: 22,
    gap: 12,
  },
  label: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  notice: {
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    padding: 14,
  },
  noticeText: {
    color: '#9a3412',
    lineHeight: 20,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: '#ea580c',
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
    color: '#0f766e',
    fontWeight: '800',
  },
  caption: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
})
