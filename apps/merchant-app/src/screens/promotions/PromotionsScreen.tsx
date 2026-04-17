import React, { useCallback, useEffect, useState } from 'react'
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
import { useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import api from '../../lib/api'

type PromotionType = 'points_multiplier' | 'discount' | 'freebie'
type PromotionStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'expired'

interface Promotion {
  id: string
  title: string
  description?: string
  type: PromotionType
  value: number
  minPurchaseAmount: number
  status: PromotionStatus
  reviewNote?: string | null
  submittedAt?: string
  expiresAt?: string | null
}

const promotionTypes: PromotionType[] = ['points_multiplier', 'discount', 'freebie']

const typeLabels: Record<PromotionType, string> = {
  points_multiplier: 'Points Multiplier',
  discount: 'Discount %',
  freebie: 'Freebie',
}

const statusColors: Record<PromotionStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: '#fff4d8', text: '#9c6500', label: 'Pending' },
  approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  active: { bg: '#dbeafe', text: '#1e40af', label: 'Active' },
  rejected: { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' },
  expired: { bg: '#f3f4f6', text: '#6b7280', label: 'Expired' },
}

const emptyForm = {
  title: '',
  description: '',
  type: 'discount' as PromotionType,
  value: '',
  minPurchaseAmount: '',
  expiresAt: '',
}

export default function PromotionsScreen() {
  const navigation = useNavigation()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const loadPromotions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/promotions')
      setPromotions(res.data.promotions || [])
    } catch {
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPromotions()
  }, [loadPromotions])

  function resetForm() {
    setForm(emptyForm)
    setSelectedId(null)
    setShowForm(false)
  }

  function handleSelectPromotion(promo: Promotion) {
    if (promo.status !== 'pending') return
    setSelectedId(promo.id)
    setForm({
      title: promo.title,
      description: promo.description || '',
      type: promo.type,
      value: String(promo.value ?? ''),
      minPurchaseAmount: String(promo.minPurchaseAmount ?? ''),
      expiresAt: promo.expiresAt ? String(promo.expiresAt).slice(0, 10) : '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      Alert.alert('Missing field', 'Please enter a title.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        value: Number(form.value || 0),
        minPurchaseAmount: Number(form.minPurchaseAmount || 0),
        expiresAt: form.expiresAt || null,
      }

      if (selectedId) {
        await api.patch(`/promotions/${selectedId}`, payload)
      } else {
        await api.post('/promotions', payload)
      }
      await loadPromotions()
      resetForm()
    } catch (err: any) {
      Alert.alert('Failed', String(err?.response?.data?.error || err?.message || 'Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    Alert.alert('Delete Promotion', 'Are you sure you want to delete this promotion?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/promotions/${selectedId}`)
            await loadPromotions()
            resetForm()
          } catch (err: any) {
            Alert.alert('Failed', String(err?.response?.data?.error || err?.message || 'Please try again.'))
          }
        },
      },
    ])
  }

  const canEditSelected = selectedId
    ? (promotions.find((p) => p.id === selectedId)?.status === 'pending')
    : true

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
          {/* Header */}
          <View style={styles.hero}>
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#014384" />
              <Text style={styles.back}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Promotions</Text>
            <Text style={styles.subtitle}>
              Submit promotions for admin approval. Approved promotions become visible to youth members.
            </Text>
          </View>

          {/* Promotion list */}
          {loading ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Loading promotions…</Text>
            </View>
          ) : promotions.length === 0 ? (
            <View style={styles.centerBox}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={40} color="#c4d4e8" />
              <Text style={styles.emptyText}>No promotions yet</Text>
              <Text style={styles.emptySubtext}>Create your first promotion below.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {promotions.map((promo) => {
                const badge = statusColors[promo.status] || statusColors.pending
                const isPending = promo.status === 'pending'
                const isSelected = selectedId === promo.id
                return (
                  <Pressable
                    key={promo.id}
                    style={[styles.promoCard, isSelected && styles.selectedCard]}
                    onPress={() => {
                      if (isPending) {
                        handleSelectPromotion(promo)
                      }
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.iconWrap}>
                        <MaterialCommunityIcons name="ticket-percent-outline" size={20} color="#014384" />
                      </View>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.promoTitle}>{promo.title}</Text>
                    <Text style={styles.promoType}>{typeLabels[promo.type] || promo.type}</Text>
                    {promo.description ? (
                      <Text style={styles.promoCopy} numberOfLines={2}>{promo.description}</Text>
                    ) : null}
                    {promo.value > 0 ? (
                      <Text style={styles.promoValue}>
                        {promo.type === 'points_multiplier' ? `${promo.value}× pts` : promo.type === 'discount' ? `${promo.value}% off` : 'Free item'}
                      </Text>
                    ) : null}
                    {promo.status === 'rejected' && promo.reviewNote ? (
                      <View style={styles.rejectBox}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#b91c1c" />
                        <Text style={styles.rejectText}>{promo.reviewNote}</Text>
                      </View>
                    ) : null}
                    {isPending ? (
                      <Text style={styles.tapHint}>Tap to edit</Text>
                    ) : null}
                  </Pressable>
                )
              })}
            </View>
          )}

          {/* Form toggle button */}
          {!showForm ? (
            <Pressable
              style={styles.addButton}
              onPress={() => { resetForm(); setShowForm(true) }}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
              <Text style={styles.addButtonText}>New Promotion</Text>
            </Pressable>
          ) : null}

          {/* Form */}
          {showForm ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{selectedId ? 'Edit Promotion' : 'New Promotion'}</Text>

              {!canEditSelected ? (
                <View style={styles.readonlyNote}>
                  <Text style={styles.readonlyNoteText}>Only pending promotions can be edited.</Text>
                </View>
              ) : null}

              <Field label="Title" value={form.title} onChangeText={(v) => setForm((s) => ({ ...s, title: v }))} editable={canEditSelected} />
              <Field label="Description" value={form.description} onChangeText={(v) => setForm((s) => ({ ...s, description: v }))} multiline editable={canEditSelected} />

              <Text style={styles.fieldLabel}>Promotion Type</Text>
              <View style={styles.chipRow}>
                {promotionTypes.map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.chip, form.type === type && styles.activeChip]}
                    onPress={() => canEditSelected && setForm((s) => ({ ...s, type }))}
                  >
                    <Text style={[styles.chipText, form.type === type && styles.activeChipText]}>
                      {typeLabels[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <Field
                  compact
                  label={form.type === 'points_multiplier' ? 'Multiplier (e.g. 2)' : form.type === 'discount' ? 'Discount %' : 'Value'}
                  value={form.value}
                  onChangeText={(v) => setForm((s) => ({ ...s, value: v }))}
                  keyboardType="numeric"
                  editable={canEditSelected}
                />
                <Field
                  compact
                  label="Min Purchase (₱)"
                  value={form.minPurchaseAmount}
                  onChangeText={(v) => setForm((s) => ({ ...s, minPurchaseAmount: v }))}
                  keyboardType="numeric"
                  editable={canEditSelected}
                />
              </View>

              <Field
                label="Expires At (YYYY-MM-DD)"
                value={form.expiresAt}
                onChangeText={(v) => setForm((s) => ({ ...s, expiresAt: v }))}
                placeholder="e.g. 2026-12-31"
                editable={canEditSelected}
              />

              {canEditSelected ? (
                <View style={styles.buttonRow}>
                  <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                    <Text style={styles.primaryButtonText}>
                      {saving ? 'Saving…' : selectedId ? 'Update Promotion' : 'Submit for Review'}
                    </Text>
                  </Pressable>
                  {selectedId ? (
                    <Pressable style={styles.deleteButton} onPress={handleDelete}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

type FieldProps = {
  label: string
  value: string
  onChangeText: (v: string) => void
  multiline?: boolean
  compact?: boolean
  keyboardType?: 'default' | 'numeric'
  placeholder?: string
  editable?: boolean
}

function Field({ label, value, onChangeText, multiline = false, compact = false, keyboardType = 'default', placeholder, editable = true }: FieldProps) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#a0b4c8"
        editable={editable}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput, !editable && styles.disabledInput]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
  keyboardShell: { flex: 1 },
  content: { padding: 18, gap: 14, paddingBottom: 36 },
  hero: {
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  back: { color: '#014384', fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '900', color: '#014384' },
  subtitle: { color: '#60748f', lineHeight: 21 },
  list: { gap: 10 },
  centerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  emptyText: { fontSize: 16, fontWeight: '800', color: '#4f647e' },
  emptySubtext: { color: '#8ea4bc', textAlign: 'center' },
  promoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  selectedCard: { borderColor: 'rgba(1, 67, 132, 0.28)', backgroundColor: '#f8fbff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#eef4fb', alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  promoTitle: { fontWeight: '800', color: '#014384', fontSize: 16 },
  promoType: { fontSize: 12, color: '#7d91aa', fontWeight: '700' },
  promoValue: { fontSize: 22, fontWeight: '900', color: '#0572dc' },
  promoCopy: { color: '#5e728b', lineHeight: 20 },
  rejectBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 10,
  },
  rejectText: { color: '#b91c1c', fontSize: 12, fontWeight: '700', flex: 1 },
  tapHint: { fontSize: 11, color: '#0572dc', fontWeight: '700', textAlign: 'right' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#014384',
    borderRadius: 16,
    paddingVertical: 16,
  },
  addButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#014384' },
  readonlyNote: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12 },
  readonlyNoteText: { color: '#6b7280', fontWeight: '700', fontSize: 13 },
  field: { gap: 8 },
  compactField: { flex: 1 },
  fieldLabel: { color: '#35506d', fontWeight: '800', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fbff',
    color: '#0f172a',
  },
  disabledInput: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
  multilineInput: { minHeight: 88 },
  row: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: '#eef4fb' },
  activeChip: { backgroundColor: '#014384' },
  chipText: { color: '#4f647e', fontWeight: '800', fontSize: 13 },
  activeChipText: { color: '#ffffff' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, borderRadius: 16, backgroundColor: '#014384', paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  deleteButton: { paddingHorizontal: 18, borderRadius: 16, backgroundColor: '#fff1ef', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: '#b42318', fontWeight: '800' },
  cancelButton: { borderRadius: 16, borderWidth: 1, borderColor: '#d9e4f0', paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { color: '#60748f', fontWeight: '800' },
})
