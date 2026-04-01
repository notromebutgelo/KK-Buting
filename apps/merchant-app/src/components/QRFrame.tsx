import React from 'react'
import { StyleSheet, View } from 'react-native'

export default function QRFrame() {
  return (
    <View style={styles.frame}>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#0f766e',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 28,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 28,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 28,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 28,
  },
})
