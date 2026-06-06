import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useAuth } from './src/hooks/useAuth'
import {
  clearRuntimeDiagnostics,
  getCurrentRuntimeError,
  getStoredRuntimeDiagnostics,
  installRuntimeDiagnostics,
  markStartupPhase,
  reportRuntimeError,
  subscribeRuntimeError,
  type RuntimeDiagnostic,
} from './src/lib/runtimeDiagnostics'
import AppNavigator from './src/navigation/AppNavigator'

type ErrorBoundaryState = {
  error: Error | null
}

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    reportRuntimeError(error, 'react-boundary')
    console.error(error)
  }

  render() {
    if (this.state.error) {
      return (
        <SafeAreaProvider>
          <View style={styles.errorShell}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Merchant app could not open</Text>
              <Text style={styles.errorMessage}>
                Restart the app. If this appears again, reinstall the latest APK build.
              </Text>
              <Text style={styles.errorDetail}>{this.state.error.message}</Text>
            </View>
          </View>
        </SafeAreaProvider>
      )
    }

    return this.props.children
  }
}

function RuntimeDiagnosticsGate({ children }: React.PropsWithChildren) {
  const [diagnostic, setDiagnostic] = useState<RuntimeDiagnostic | null>(() => getCurrentRuntimeError())
  const [startupPhase, setStartupPhase] = useState<string | null>(null)

  useEffect(() => {
    installRuntimeDiagnostics()
    void markStartupPhase('app-mounted')

    const unsubscribe = subscribeRuntimeError((nextDiagnostic) => {
      setDiagnostic(nextDiagnostic)
    })

    void getStoredRuntimeDiagnostics().then((stored) => {
      if (stored.diagnostic && !getCurrentRuntimeError()) {
        setDiagnostic(stored.diagnostic)
      }
      if (stored.startupPhase) {
        setStartupPhase(`${stored.startupPhase.phase} at ${stored.startupPhase.createdAt}`)
      }
    })

    return unsubscribe
  }, [])

  if (diagnostic) {
    return (
      <View style={styles.errorShell}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Merchant app caught a startup issue</Text>
          <Text style={styles.errorMessage}>
            This diagnostic build prevented the crash so we can see what failed.
          </Text>
          <Text style={styles.errorDetail}>Source: {diagnostic.source}</Text>
          <Text style={styles.errorDetail}>Message: {diagnostic.message}</Text>
          {startupPhase ? <Text style={styles.errorDetail}>Startup: {startupPhase}</Text> : null}
          {diagnostic.stack ? <Text style={styles.errorStack} numberOfLines={8}>{diagnostic.stack}</Text> : null}
          <Pressable
            style={styles.errorButton}
            onPress={() => {
              void clearRuntimeDiagnostics()
              setDiagnostic(null)
            }}
          >
            <Text style={styles.errorButtonText}>Open app anyway</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return children
}

function MerchantApp() {
  useAuth()

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RuntimeDiagnosticsGate>
        <AppNavigator />
      </RuntimeDiagnosticsGate>
    </SafeAreaProvider>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <MerchantApp />
    </AppErrorBoundary>
  )
}

const styles = StyleSheet.create({
  errorShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: '#f0f0f0',
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ffd8d3',
    backgroundColor: '#fff7f6',
    padding: 22,
  },
  errorTitle: {
    color: '#014384',
    fontSize: 18,
    fontWeight: '900',
  },
  errorMessage: {
    color: '#35506d',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorDetail: {
    color: '#b42318',
    fontSize: 12,
    lineHeight: 18,
  },
  errorStack: {
    color: '#7a271a',
    fontSize: 11,
    lineHeight: 16,
  },
  errorButton: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#014384',
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
})
