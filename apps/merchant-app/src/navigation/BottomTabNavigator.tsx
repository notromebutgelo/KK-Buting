import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type MerchantTabParamList = {
  Home: undefined
  Scan: undefined
  Shop: undefined
  Alerts: undefined
  Account: undefined
}

const Tab = createBottomTabNavigator<MerchantTabParamList>()

type ScreenModule = {
  default: React.ComponentType<any>
}

declare const require: {
  (path: '../screens/dashboards/DashboardScreen'): ScreenModule
  (path: '../screens/scanner/ScanScreen'): ScreenModule
  (path: '../screens/shop/ShopProfileScreen'): ScreenModule
  (path: '../screens/notifications/NotificationsScreen'): ScreenModule
  (path: '../screens/profile/ProfileScreen'): ScreenModule
}

function createLazyScreen(loadScreen: () => ScreenModule) {
  return function LazyScreen(props: any) {
    const Screen = React.useMemo(() => loadScreen().default, [])
    return <Screen {...props} />
  }
}

const DashboardScreen = createLazyScreen(() => require('../screens/dashboards/DashboardScreen'))
const ScanScreen = createLazyScreen(() => require('../screens/scanner/ScanScreen'))
const ShopProfileScreen = createLazyScreen(() => require('../screens/shop/ShopProfileScreen'))
const NotificationsScreen = createLazyScreen(() => require('../screens/notifications/NotificationsScreen'))
const ProfileScreen = createLazyScreen(() => require('../screens/profile/ProfileScreen'))

function getTabIcon(routeName: keyof MerchantTabParamList, focused: boolean) {
  if (routeName === 'Home') return focused ? 'view-dashboard' : 'view-dashboard-outline'
  if (routeName === 'Scan') return focused ? 'qrcode-scan' : 'qrcode-scan'
  if (routeName === 'Shop') return focused ? 'storefront' : 'storefront-outline'
  if (routeName === 'Alerts') return focused ? 'bell' : 'bell-outline'
  return focused ? 'account-circle' : 'account-circle-outline'
}

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets()
  const bottomPadding = Math.max(insets.bottom, 10)

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#014384',
        tabBarInactiveTintColor: '#6a7f98',
        tabBarStyle: {
          height: 64 + bottomPadding,
          paddingTop: 10,
          paddingBottom: bottomPadding,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: 'rgba(1, 67, 132, 0.08)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, focused, size }) => (
          <MaterialCommunityIcons
            name={getTabIcon(route.name as keyof MerchantTabParamList, focused)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Shop" component={ShopProfileScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
