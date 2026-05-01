import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

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
  MerchantTabs: undefined
  Transactions: undefined
  Promotions: undefined
  Products: undefined
  ScanSuccess: { points?: number; memberLabel?: string; memberIdMasked?: string; amountSpent?: number }
  ScanFailed: { message?: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

function FullScreenLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#0f766e" />
    </View>
  )
}

export default function AppNavigator() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  if (!hasHydrated || isLoading) {
    return <FullScreenLoader />
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
    backgroundColor: '#f6f6ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
