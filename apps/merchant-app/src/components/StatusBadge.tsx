import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { MerchantStatus } from '../types/merchant'
import { getStatusLabel } from '../utils/merchant'

type StatusBadgeProps = {
  status: MerchantStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        status === 'active' && styles.activeBadge,
        status === 'pending' && styles.pendingBadge,
        status === 'suspended' && styles.suspendedBadge,
      ]}
    >
      <Text
        style={[
          styles.text,
          status === 'active' && styles.activeText,
          status === 'pending' && styles.pendingText,
          status === 'suspended' && styles.suspendedText,
        ]}
      >
        {getStatusLabel(status)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  suspendedBadge: {
    backgroundColor: '#fee2e2',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
  activeText: {
    color: '#166534',
  },
  pendingText: {
    color: '#9a3412',
  },
  suspendedText: {
    color: '#b91c1c',
  },
})
