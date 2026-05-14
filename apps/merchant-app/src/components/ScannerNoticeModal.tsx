import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

type ScannerNoticeModalProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  secondaryLabel?: string
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  tone?: 'warning' | 'danger' | 'info'
  onClose: () => void
  onSecondaryAction?: () => void
}

export default function ScannerNoticeModal({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  secondaryLabel,
  iconName = 'qrcode-remove',
  tone = 'warning',
  onClose,
  onSecondaryAction,
}: ScannerNoticeModalProps) {
  const palette = getPalette(tone)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: palette.softBackground }]}>
            <MaterialCommunityIcons name={iconName} size={32} color={palette.icon} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {secondaryLabel && onSecondaryAction ? (
              <Pressable style={styles.secondaryButton} onPress={onSecondaryAction}>
                <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function getPalette(tone: 'warning' | 'danger' | 'info') {
  if (tone === 'danger') {
    return {
      icon: '#c2410c',
      softBackground: '#fff1f2',
    }
  }

  if (tone === 'info') {
    return {
      icon: '#014384',
      softBackground: '#eef4fb',
    }
  }

  return {
    icon: '#9c6500',
    softBackground: '#fff4d8',
  }
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
  actions: {
    width: '100%',
    marginTop: 6,
    gap: 10,
  },
  button: {
    width: '100%',
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
  secondaryButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9e4f0',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#35506d',
    fontSize: 15,
    fontWeight: '800',
  },
})
