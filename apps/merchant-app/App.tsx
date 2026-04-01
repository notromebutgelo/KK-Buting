import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useAuth } from './src/hooks/useAuth'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  useAuth()

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  )
}
