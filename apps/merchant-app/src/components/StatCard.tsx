import React from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'

type StatCardProps = {
  label: string
  value: string
  caption?: string
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  iconColor?: string
  iconBackground?: string
  valueColor?: string
}

export default function StatCard({
  label,
  value,
  caption,
  icon,
  iconColor = '#0a5fd8',
  iconBackground = '#eef4ff',
  valueColor = '#014384',
}: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
          <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 156,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 4,
  },
  label: {
    flex: 1,
    color: '#63748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    lineHeight: 15,
  },
  value: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  caption: {
    color: '#60748f',
    fontSize: 13,
    lineHeight: 18,
  },
})
