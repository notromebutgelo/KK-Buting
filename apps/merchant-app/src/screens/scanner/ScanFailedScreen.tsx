import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'

import type { RootStackParamList } from '../../navigation/AppNavigator'

type ScreenRoute = RouteProp<RootStackParamList, 'ScanFailed'>

export default function ScanFailedScreen() {
  const navigation = useNavigation()
  const route = useRoute<ScreenRoute>()

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>Scan Failed</Text>
        <Text style={styles.message}>{route.params?.message ?? 'The QR token could not be processed.'}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#c2410c',
  },
  message: {
    color: '#7c2d12',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#c2410c',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
})
