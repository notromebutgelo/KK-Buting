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
      <View style={[styles.accent, tone === 'neutral' && styles.neutralAccent]} />
      <Text style={[styles.label, tone === 'neutral' && styles.neutralLabel]}>{label}</Text>
      <Text style={[styles.value, tone === 'neutral' && styles.neutralValue]}>{value}</Text>
      {caption ? <Text style={[styles.caption, tone === 'neutral' && styles.neutralCaption]}>{caption}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 122,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  neutralCard: {
    backgroundColor: '#fffaf0',
  },
  accent: {
    width: 34,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#0572dc',
    marginBottom: 8,
  },
  neutralAccent: {
    backgroundColor: '#fcb315',
  },
  label: {
    color: '#6a7f98',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  neutralLabel: {
    color: '#7f6d44',
  },
  value: {
    color: '#014384',
    fontSize: 28,
    fontWeight: '900',
  },
  caption: {
    color: '#587290',
    fontSize: 12,
    lineHeight: 18,
  },
  neutralValue: {
    color: '#9c6500',
  },
  neutralCaption: {
    color: '#8a764e',
  },
})
