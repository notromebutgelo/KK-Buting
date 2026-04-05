import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import type { RootStackParamList } from '../../navigation/AppNavigator'

type ScreenRoute = RouteProp<RootStackParamList, 'ScanSuccess'>

export default function ScanSuccessSreen() {
  const navigation = useNavigation()
  const route = useRoute<ScreenRoute>()

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="check-circle" size={40} color="#014384" />
        </View>
        <Text style={styles.title}>Scan Successful</Text>
        <Text style={styles.name}>{route.params?.memberLabel ?? 'Verified Member'}</Text>
        <Text style={styles.meta}>{route.params?.memberIdMasked ?? 'Member ID hidden'}</Text>
        <Text style={styles.points}>+{route.params?.points ?? 0} points recorded</Text>
        <Text style={styles.meta}>Amount spent: PHP {Number(route.params?.amountSpent ?? 0).toFixed(2)}</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Scanner</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#014384',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#014384',
    textAlign: 'center',
  },
  points: {
    fontSize: 18,
    color: '#0572dc',
    fontWeight: '800',
  },
  meta: {
    color: '#60748f',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#014384',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
})
