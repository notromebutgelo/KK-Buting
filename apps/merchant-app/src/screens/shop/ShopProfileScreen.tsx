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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import StatusBadge from '../../components/StatusBadge'
import StatusBanner from '../../components/StatusBanner'
import { getMerchantProfile, updateMerchantProfile } from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { RootStackParamList } from '../../navigation/AppNavigator'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ShopProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    contactNumber: '',
    address: '',
    shortDescription: '',
    businessInfo: '',
    discountInfo: '',
    termsAndConditions: '',
    logoUrl: '',
    bannerUrl: '',
    status: 'active' as 'pending' | 'active' | 'suspended',
    adminNote: '',
  })

  useEffect(() => {
    let active = true

    void getMerchantProfile(user).then((profile) => {
      if (!active) return

      setForm({
        businessName: profile.businessName,
        category: profile.category,
        contactNumber: profile.contactNumber,
        address: profile.address,
        shortDescription: profile.shortDescription,
        businessInfo: profile.businessInfo,
        discountInfo: profile.discountInfo,
        termsAndConditions: profile.termsAndConditions,
        logoUrl: profile.logoUrl,
        bannerUrl: profile.bannerUrl,
        status: profile.status,
        adminNote: profile.adminNote,
      })
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [user])

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateMerchantProfile(user, form)
      Alert.alert('Saved', 'Your shop profile has been updated in the shared merchant record.')
    } catch {
      Alert.alert('Save failed', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading shop profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <Text style={styles.title}>My Shop</Text>
              <Text style={styles.subtitle}>
                Update the business profile that youth members will eventually see in the merchant directory.
              </Text>
            </View>
            <StatusBadge status={form.status} />
          </View>
          <StatusBanner status={form.status} message={form.adminNote} />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Promotions')}>
            <Text style={styles.secondaryButtonText}>Open Promotions</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Products')}>
            <Text style={styles.secondaryButtonText}>Open Products</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <Field label="Business name" value={form.businessName} onChangeText={(value) => setForm((current) => ({ ...current, businessName: value }))} />
          <Field label="Category" value={form.category} onChangeText={(value) => setForm((current) => ({ ...current, category: value }))} />
          <Field
            label="Contact number"
            value={form.contactNumber}
            keyboardType="phone-pad"
            onChangeText={(value) => setForm((current) => ({ ...current, contactNumber: value }))}
          />
          <Field label="Address" value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} multiline />
          <Field
            label="Short description"
            value={form.shortDescription}
            onChangeText={(value) => setForm((current) => ({ ...current, shortDescription: value }))}
            multiline
          />
          <Field
            label="Business info"
            value={form.businessInfo}
            onChangeText={(value) => setForm((current) => ({ ...current, businessInfo: value }))}
            multiline
          />
          <Field label="Logo URL" value={form.logoUrl} onChangeText={(value) => setForm((current) => ({ ...current, logoUrl: value }))} />
          <Field label="Banner URL" value={form.bannerUrl} onChangeText={(value) => setForm((current) => ({ ...current, bannerUrl: value }))} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Youth-facing Content</Text>
          <Field
            label="Discount info"
            value={form.discountInfo}
            onChangeText={(value) => setForm((current) => ({ ...current, discountInfo: value }))}
            multiline
          />
          <Field
            label="Terms and conditions"
            value={form.termsAndConditions}
            onChangeText={(value) => setForm((current) => ({ ...current, termsAndConditions: value }))}
            multiline
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <Text style={styles.previewName}>{form.businessName}</Text>
          <Text style={styles.previewCategory}>{form.category}</Text>
          <Text style={styles.previewCopy}>{form.shortDescription}</Text>
          <Text style={styles.previewMeta}>{form.address}</Text>
          <Text style={styles.previewMeta}>{form.discountInfo}</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Shop Profile'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

type FieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  keyboardType?: 'default' | 'phone-pad'
  multiline?: boolean
}

function Field({ label, value, onChangeText, keyboardType = 'default', multiline = false }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
        placeholderTextColor="#94a3b8"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f6ef',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#4b5563',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  heroHeader: {
    gap: 12,
  },
  heroText: {
    gap: 6,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#c2410c',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14,
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
  previewCard: {
    backgroundColor: '#134e4a',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  previewName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  previewCategory: {
    color: '#99f6e4',
    fontWeight: '700',
  },
  previewCopy: {
    color: '#d1fae5',
    lineHeight: 21,
  },
  previewMeta: {
    color: '#ccfbf1',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
})
