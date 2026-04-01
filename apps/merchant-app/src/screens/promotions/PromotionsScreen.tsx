import React, { useEffect, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import {
  deleteMerchantPromotion,
  getMerchantPromotions,
  saveMerchantPromotion,
} from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { MerchantPromotion } from '../../types/merchant'
import { formatDate } from '../../utils/merchant'

const promotionTypes: MerchantPromotion['type'][] = ['discount', 'fixed_amount', 'bundle']
const availabilities: MerchantPromotion['availability'][] = ['dine-in', 'takeout', 'delivery']

export default function PromotionsScreen() {
  const navigation = useNavigation()
  const user = useAuthStore((state) => state.user)
  const [promotions, setPromotions] = useState<MerchantPromotion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    shortTagline: '',
    bannerUrl: '',
    startDate: '',
    endDate: '',
    type: 'discount' as MerchantPromotion['type'],
    valueLabel: '',
    availability: 'dine-in' as MerchantPromotion['availability'],
    terms: '',
    isActive: true,
  })

  const loadPromotions = async () => {
    const items = await getMerchantPromotions(user)
    setPromotions(items)
  }

  const resetForm = () => {
    setSelectedId(null)
    setForm({
      title: '',
      shortTagline: '',
      bannerUrl: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      type: 'discount',
      valueLabel: '',
      availability: 'dine-in',
      terms: '',
      isActive: true,
    })
  }

  useEffect(() => {
    resetForm()
    void loadPromotions()
  }, [user])

  const handleSelect = (promotion: MerchantPromotion) => {
    setSelectedId(promotion.id)
    setForm({
      title: promotion.title,
      shortTagline: promotion.shortTagline,
      bannerUrl: promotion.bannerUrl,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      type: promotion.type,
      valueLabel: promotion.valueLabel,
      availability: promotion.availability,
      terms: promotion.terms.join('\n'),
      isActive: promotion.isActive,
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveMerchantPromotion(user, {
        id: selectedId || undefined,
        title: form.title,
        shortTagline: form.shortTagline,
        bannerUrl: form.bannerUrl,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        valueLabel: form.valueLabel,
        availability: form.availability,
        terms: form.terms
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        isActive: form.isActive,
      })
      await loadPromotions()
      resetForm()
    } catch {
      Alert.alert('Save failed', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await deleteMerchantPromotion(user, selectedId)
    await loadPromotions()
    resetForm()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Promotions</Text>
          <Text style={styles.subtitle}>Create discount cards and active promo banners for the merchant workspace.</Text>
        </View>

        <View style={styles.list}>
          {promotions.map((promotion) => (
            <Pressable
              key={promotion.id}
              style={[styles.promoCard, selectedId === promotion.id && styles.selectedCard]}
              onPress={() => handleSelect(promotion)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.promoTitle}>{promotion.title}</Text>
                <Text style={[styles.badge, !promotion.isActive && styles.inactiveBadge]}>
                  {promotion.isActive ? 'Active' : 'Paused'}
                </Text>
              </View>
              <Text style={styles.promoValue}>{promotion.valueLabel}</Text>
              <Text style={styles.promoCopy}>{promotion.shortTagline}</Text>
              <Text style={styles.promoMeta}>
                {formatDate(promotion.startDate)} to {formatDate(promotion.endDate)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{selectedId ? 'Edit Promotion' : 'New Promotion'}</Text>
          <Field label="Promotion title" value={form.title} onChangeText={(value) => setForm((current) => ({ ...current, title: value }))} />
          <Field
            label="Short tagline"
            value={form.shortTagline}
            onChangeText={(value) => setForm((current) => ({ ...current, shortTagline: value }))}
            multiline
          />
          <Field label="Banner URL" value={form.bannerUrl} onChangeText={(value) => setForm((current) => ({ ...current, bannerUrl: value }))} />
          <View style={styles.row}>
            <Field compact label="Start date" value={form.startDate} onChangeText={(value) => setForm((current) => ({ ...current, startDate: value }))} />
            <Field compact label="End date" value={form.endDate} onChangeText={(value) => setForm((current) => ({ ...current, endDate: value }))} />
          </View>
          <Field label="Value label" value={form.valueLabel} onChangeText={(value) => setForm((current) => ({ ...current, valueLabel: value }))} />

          <Text style={styles.fieldLabel}>Promotion type</Text>
          <View style={styles.chipRow}>
            {promotionTypes.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, form.type === type && styles.activeChip]}
                onPress={() => setForm((current) => ({ ...current, type }))}
              >
                <Text style={[styles.chipText, form.type === type && styles.activeChipText]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Availability</Text>
          <View style={styles.chipRow}>
            {availabilities.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, form.availability === type && styles.activeChip]}
                onPress={() => setForm((current) => ({ ...current, availability: type }))}
              >
                <Text style={[styles.chipText, form.availability === type && styles.activeChipText]}>{type}</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Bullet terms"
            value={form.terms}
            onChangeText={(value) => setForm((current) => ({ ...current, terms: value }))}
            multiline
          />

          <Pressable
            style={[styles.toggleRow, form.isActive && styles.toggleRowActive]}
            onPress={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
          >
            <Text style={[styles.toggleText, form.isActive && styles.toggleTextActive]}>
              {form.isActive ? 'Promotion is active' : 'Promotion is paused'}
            </Text>
          </Pressable>

          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : selectedId ? 'Update Promotion' : 'Create Promotion'}</Text>
            </Pressable>
            {selectedId ? (
              <Pressable style={styles.secondaryButton} onPress={handleDelete}>
                <Text style={styles.secondaryButtonText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

type FieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  multiline?: boolean
  compact?: boolean
}

function Field({ label, value, onChangeText, multiline = false, compact = false }: FieldProps) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
      />
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
  header: {
    gap: 8,
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
  list: {
    gap: 12,
  },
  promoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTitle: {
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  badge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
  },
  inactiveBadge: {
    backgroundColor: '#e5e7eb',
    color: '#475569',
  },
  promoValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ea580c',
  },
  promoCopy: {
    color: '#4b5563',
    lineHeight: 20,
  },
  promoMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  field: {
    gap: 8,
  },
  compactField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  multilineInput: {
    minHeight: 88,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  activeChip: {
    backgroundColor: '#0f766e',
  },
  chipText: {
    color: '#334155',
    fontWeight: '700',
  },
  activeChipText: {
    color: '#ffffff',
  },
  toggleRow: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#e5e7eb',
  },
  toggleRowActive: {
    backgroundColor: '#dcfce7',
  },
  toggleText: {
    color: '#475569',
    fontWeight: '800',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: '#166534',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  secondaryButton: {
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
  },
})
