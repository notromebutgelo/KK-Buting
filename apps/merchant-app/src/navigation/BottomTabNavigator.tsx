import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

import DashboardScreen from '../screens/dashboards/DashboardScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'
import ScanScreen from '../screens/scanner/ScanScreen'
import ShopProfileScreen from '../screens/shop/ShopProfileScreen'

export type MerchantTabParamList = {
  Home: undefined
  Scan: undefined
  Shop: undefined
  Alerts: undefined
  Account: undefined
}

const Tab = createBottomTabNavigator<MerchantTabParamList>()

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0f766e',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Shop" component={ShopProfileScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
