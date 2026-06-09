import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useAuthStore } from '../store/authStore'
import LoginSreen from '../screens/auth/LoginSreen'
import ProductMenuScreen from '../screens/products/ProductMenuScreen'
import PromotionsScreen from '../screens/promotions/PromotionsScreen'
import BottomTabNavigator from './BottomTabNavigator'
import ScanFailedScreen from '../screens/scanner/ScanFailedScreen'
import ScanSuccessSreen from '../screens/scanner/ScanSuccessSreen'
import TransactionScreen from '../screens/transaction/TransactionScreen'
import ForcePasswordChangeScreen from '../screens/auth/ForcePasswordChangeScreen'

export type RootStackParamList = {
  Login: undefined
  ForcePasswordChange: undefined
  ChangePassword: undefined
  MerchantTabs: undefined
  Transactions: undefined
  Promotions: undefined
  Products: undefined
  ScanSuccess: { points?: number; memberLabel?: string; memberIdMasked?: string; amountSpent?: number }
  ScanFailed: {
    message?: string
    scanPayloadKind?: string
    scanPayloadLength?: number
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function FullScreenLoader({
  title,
  message,
  actions,
}: {
  title: string
  message: string
  actions?: React.ReactNode
}) {
  return (
    <View style={styles.loader}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingIcon}>
          <MaterialCommunityIcons name="storefront-outline" size={30} color="#014384" />
        </View>
        <ActivityIndicator size="large" color="#014384" />
        <View style={styles.loadingCopy}>
          <Text style={styles.loadingTitle}>{title}</Text>
          <Text style={styles.loadingMessage}>{message}</Text>
        </View>
        {actions ? <View style={styles.loadingActions}>{actions}</View> : null}
      </View>
    </View>
  )
}

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const setLoading = useAuthStore((state) => state.setLoading)
  const logout = useAuthStore((state) => state.logout)

  if (!hasHydrated) {
    return (
      <FullScreenLoader
        title="Opening Merchant Console"
        message="Please wait while we restore your saved session."
      />
    )
  }

  if (isLoading) {
    return (
      <FullScreenLoader
        title="Preparing Your Workspace"
        message="Please wait while we verify your merchant account and load access details."
        actions={
          user ? (
            <>
              <Pressable style={styles.primaryAction} onPress={() => setLoading(false)}>
                <Text style={styles.primaryActionText}>Continue with saved session</Text>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => void logout()}>
                <Text style={styles.secondaryActionText}>Return to login</Text>
              </Pressable>
            </>
          ) : undefined
        }
      />
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f6f6ef' },
        }}
      >
        {user ? user.mustChangePassword ? (
          <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
        ) : (
          <>
            <Stack.Screen name="MerchantTabs" component={BottomTabNavigator} />
            <Stack.Screen name="ChangePassword" component={ForcePasswordChangeScreen} />
            <Stack.Screen name="Transactions" component={TransactionScreen} />
            <Stack.Screen name="Promotions" component={PromotionsScreen} />
            <Stack.Screen name="Products" component={ProductMenuScreen} />
            <Stack.Screen name="ScanSuccess" component={ScanSuccessSreen} />
            <Stack.Screen name="ScanFailed" component={ScanFailedScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginSreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#014384',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  loadingCopy: {
    gap: 8,
    alignItems: 'center',
  },
  loadingActions: {
    width: '100%',
    gap: 10,
  },
  loadingTitle: {
    color: '#014384',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  loadingMessage: {
    color: '#60748f',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryAction: {
    borderRadius: 16,
    backgroundColor: '#014384',
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryAction: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9e4f0',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#014384',
    fontSize: 14,
    fontWeight: '800',
  },
})
