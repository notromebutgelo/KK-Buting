import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'KK Merchant',
  slug: 'kk-merchant-app',
  scheme: 'kkmerchant',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.kksystem.merchant',
  },
  android: {
    package: 'com.kksystem.merchant',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow KK Merchant to scan member QR codes.',
      },
    ],
  ],
  experiments: {
    autolinkingModuleResolution: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
}

export default config
