import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

type StatCardProps = {
  label: string
  value: string
  caption?: string
  tone?: 'brand' | 'neutral'
}

export default function StatCard({ label, value, caption, tone = 'brand' }: StatCardProps) {
  return (
    <View style={[styles.card, tone === 'neutral' && styles.neutralCard]}>
      <Text style={[styles.label, tone === 'neutral' && styles.neutralLabel]}>{label}</Text>
      <Text style={[styles.value, tone === 'neutral' && styles.neutralValue]}>{value}</Text>
      {caption ? <Text style={[styles.caption, tone === 'neutral' && styles.neutralLabel]}>{caption}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#0f766e',
    padding: 18,
    gap: 8,
  },
  neutralCard: {
    backgroundColor: '#fff7ed',
  },
  label: {
    color: '#d1fae5',
    fontSize: 13,
    fontWeight: '600',
  },
  neutralLabel: {
    color: '#9a3412',
  },
  value: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  caption: {
    color: '#ccfbf1',
    fontSize: 12,
    lineHeight: 17,
  },
  neutralValue: {
    color: '#c2410c',
  },
})
