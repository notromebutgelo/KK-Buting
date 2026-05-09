import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

type ScannerNoticeModalProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  onClose: () => void
}

export default function ScannerNoticeModal({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  onClose,
}: ScannerNoticeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="qrcode-remove" size={32} color="#9c6500" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 22, 48, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff4d8',
  },
  title: {
    color: '#014384',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#60748f',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: '#014384',
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
})
