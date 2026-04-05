import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import TransactionCard from '../../components/TransactionCard'
import { useTransaction } from '../../hooks/useTransaction'

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
      <KeyboardAvoidingView
        style={styles.keyboardShell}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#014384" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>Review scan activity, search masked member logs, and prepare records for reporting.</Text>

          <View style={styles.summaryRow}>
            <SummaryCard label="Success" value={String(successCount)} tone="blue" />
            <SummaryCard label="Failed" value={String(failedCount)} tone="gold" />
            <SummaryCard label="Points" value={String(totalPoints)} tone="blue" />
          </View>
        </View>

        <View style={styles.panel}>
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
        </View>

        {isLoading ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Loading transactions...</Text>
            <Text style={styles.placeholderText}>Fetching your latest merchant scan activity.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredTransactions.map((item) => (
              <TransactionCard key={item.id} item={item} />
            ))}
            {!filteredTransactions.length ? (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderTitle}>No transactions found</Text>
                <Text style={styles.placeholderText}>No transactions matched the current search and filter.</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'gold'
}) {
  return (
    <View style={[styles.summaryCard, tone === 'gold' && styles.summaryCardGold]}>
      <Text style={[styles.summaryLabel, tone === 'gold' && styles.summaryLabelGold]}>{label}</Text>
      <Text style={[styles.summaryValue, tone === 'gold' && styles.summaryValueGold]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    color: '#014384',
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#014384',
  },
  subtitle: {
    color: '#60748f',
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#eef4fb',
    gap: 4,
  },
  summaryCardGold: {
    backgroundColor: '#fff4d8',
  },
  summaryLabel: {
    color: '#7d91aa',
    fontWeight: '800',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#014384',
    fontWeight: '900',
    fontSize: 24,
  },
  summaryLabelGold: {
    color: '#9c6500',
  },
  summaryValueGold: {
    color: '#9c6500',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fbff',
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#eef4fb',
  },
  activeChip: {
    backgroundColor: '#014384',
  },
  filterText: {
    color: '#4f647e',
    fontWeight: '800',
  },
  activeChipText: {
    color: '#ffffff',
  },
  exportButton: {
    alignSelf: 'flex-start',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff4d8',
  },
  exportButtonText: {
    color: '#9c6500',
    fontWeight: '800',
  },
  placeholder: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    gap: 6,
  },
  placeholderTitle: {
    color: '#014384',
    fontWeight: '800',
  },
  placeholderText: {
    color: '#60748f',
  },
  list: {
    gap: 12,
  },
})
