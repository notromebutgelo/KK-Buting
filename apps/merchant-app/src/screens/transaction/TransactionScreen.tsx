import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import TransactionCard from '../../components/TransactionCard'
import { useTransaction } from '../../hooks/useTransaction'
import type { MerchantTransaction } from '../../types/merchant'

type FilterKey = 'all' | 'success' | 'failed' | 'today' | 'week' | 'month'

export default function TransactionScreen() {
  const navigation = useNavigation()
  const { transactions, isLoading, refresh } = useTransaction()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh])
  )

  const filteredTransactions = useMemo(() => {
    const today = new Date()

    return transactions.filter((transaction) => {
      const createdAt = new Date(transaction.createdAt)
      const ageMs = today.getTime() - createdAt.getTime()
      const matchesQuery =
        !query ||
        transaction.memberLabel.toLowerCase().includes(query.toLowerCase()) ||
        transaction.memberIdMasked.toLowerCase().includes(query.toLowerCase())

      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'success'
            ? transaction.status === 'success'
            : filter === 'failed'
              ? transaction.status === 'failed'
              : filter === 'today'
                ? transaction.createdAt.slice(0, 10) === today.toISOString().slice(0, 10)
                : filter === 'week'
                  ? ageMs <= 1000 * 60 * 60 * 24 * 7
                  : createdAt.getMonth() === today.getMonth() && createdAt.getFullYear() === today.getFullYear()

      return matchesQuery && matchesFilter
    })
  }, [filter, query, transactions])

  const successCount = filteredTransactions.filter((item) => item.status === 'success').length
  const failedCount = filteredTransactions.filter((item) => item.status === 'failed').length
  const totalPoints = filteredTransactions.reduce((sum, item) => sum + item.pointsAwarded, 0)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>Review QR scan activity, search masked member logs, and prep for future CSV export.</Text>

        <View style={styles.summaryRow}>
          <SummaryCard label="Success" value={String(successCount)} />
          <SummaryCard label="Failed" value={String(failedCount)} tone="warning" />
          <SummaryCard label="Points" value={String(totalPoints)} tone="brand" />
        </View>

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search member label or masked ID"
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.filterRow}>
          {(['all', 'success', 'failed', 'today', 'week', 'month'] as FilterKey[]).map((item) => (
            <Pressable
              key={item}
              style={[styles.filterChip, filter === item && styles.activeChip]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.activeChipText]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.exportButton}
          onPress={() => Alert.alert('Export queued', 'CSV export will be connected once the reporting module is ready.')}
        >
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Loading transactions...</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredTransactions.map((item) => (
              <TransactionCard key={item.id} item={item} />
            ))}
            {!filteredTransactions.length ? (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>No transactions matched the current filter.</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

type SummaryCardProps = {
  label: string
  value: string
  tone?: 'brand' | 'warning'
}

function SummaryCard({ label, value, tone = 'brand' }: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, tone === 'warning' && styles.warningCard]}>
      <Text style={[styles.summaryLabel, tone === 'warning' && styles.warningText]}>{label}</Text>
      <Text style={[styles.summaryValue, tone === 'warning' && styles.warningText]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6ef',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  back: {
    color: '#0f766e',
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#dcfce7',
    gap: 6,
  },
  warningCard: {
    backgroundColor: '#fff7ed',
  },
  summaryLabel: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#166534',
    fontWeight: '900',
    fontSize: 24,
  },
  warningText: {
    color: '#c2410c',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  activeChip: {
    backgroundColor: '#0f766e',
  },
  filterText: {
    color: '#334155',
    fontWeight: '700',
  },
  activeChipText: {
    color: '#ffffff',
  },
  exportButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff7ed',
  },
  exportButtonText: {
    color: '#c2410c',
    fontWeight: '800',
  },
  placeholder: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  placeholderText: {
    color: '#6b7280',
  },
  list: {
    gap: 12,
  },
})
