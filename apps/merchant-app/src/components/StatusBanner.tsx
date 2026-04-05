import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { MerchantStatus } from '../types/merchant'
import { getStatusMessage } from '../utils/merchant'

type StatusBannerProps = {
  status: MerchantStatus
  message?: string
}

export default function StatusBanner({ status, message }: StatusBannerProps) {
  if (status === 'active' && !message) {
    return null
  }

  return (
    <View
      style={[
        styles.banner,
        status === 'pending' && styles.pendingBanner,
        status === 'suspended' && styles.suspendedBanner,
        status === 'active' && styles.activeBanner,
      ]}
    >
      <Text
        style={[
          styles.text,
          status === 'pending' && styles.pendingText,
          status === 'suspended' && styles.suspendedText,
          status === 'active' && styles.activeText,
        ]}
      >
        {message || getStatusMessage(status)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 18,
    padding: 16,
  },
  activeBanner: {
    backgroundColor: '#edf4fb',
  },
  pendingBanner: {
    backgroundColor: '#fff8e7',
  },
  suspendedBanner: {
    backgroundColor: '#fef2f2',
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  activeText: {
    color: '#014384',
  },
  pendingText: {
    color: '#9c6500',
  },
  suspendedText: {
    color: '#991b1b',
  },
})
