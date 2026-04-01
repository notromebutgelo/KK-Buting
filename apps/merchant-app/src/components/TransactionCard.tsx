import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { MerchantTransaction } from '../types/merchant'
import { formatCurrency, formatDateTime } from '../utils/merchant'

type TransactionCardProps = {
  item: MerchantTransaction
}

export default function TransactionCard({ item }: TransactionCardProps) {
  const timeLabel = formatDateTime(item.createdAt)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.memberLabel}</Text>
        <Text style={[styles.badge, item.status === 'failed' && styles.badgeFailed]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.points}>{item.pointsAwarded} pts</Text>
      <Text style={styles.meta}>{item.memberIdMasked}</Text>
      <Text style={styles.meta}>{formatCurrency(item.amountSpent)}</Text>
      <Text style={styles.meta}>{timeLabel}</Text>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    color: '#166534',
    textTransform: 'capitalize',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeFailed: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
  },
  points: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f766e',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
  },
  note: {
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
  },
})
