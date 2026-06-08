import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'KK Merchant',
  slug: 'kk-merchant-app',
  scheme: 'kkmerchant',
  version: '1.0.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: 'com.kksystem.merchant',
  },
  android: {
    package: 'com.kksystem.merchant',
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#001b5f',
    },
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow KK Merchant to scan member QR codes.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow KK Merchant to access your photo library for shop logos and banners.',
      },
    ],
  ],
  experiments: {
    autolinkingModuleResolution: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
    eas: {
      projectId: '9b8f3495-707b-48ab-a734-6376254889ba',
    },
  },
}

export default config
