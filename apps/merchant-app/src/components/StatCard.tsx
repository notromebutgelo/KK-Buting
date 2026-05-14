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
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 148,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
    shadowColor: '#014384',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: '#63748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  value: {
    fontSize: 30,
    fontWeight: '900',
  },
  caption: {
    color: '#60748f',
    fontSize: 14,
    lineHeight: 20,
  },
})
