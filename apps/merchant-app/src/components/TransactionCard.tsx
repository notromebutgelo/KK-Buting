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
        <Text style={styles.name} numberOfLines={1}>{item.memberLabel}</Text>
        <Text style={[styles.badge, item.status === 'failed' && styles.badgeFailed]}>
          {item.status}
        </Text>
      </View>
      <View style={styles.metricsRow}>
        <View>
          <Text style={styles.points}>{item.pointsAwarded} pts</Text>
          <Text style={styles.meta}>{item.memberIdMasked}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{formatCurrency(item.amountSpent)}</Text>
          <Text style={styles.meta}>{timeLabel}</Text>
        </View>
      </View>
      {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#014384',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#edf4fb',
    color: '#014384',
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
    fontWeight: '900',
    color: '#0572dc',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9c6500',
  },
  meta: {
    color: '#6a7f98',
    fontSize: 12,
  },
  note: {
    color: '#586777',
    fontSize: 12,
    lineHeight: 18,
  },
})
