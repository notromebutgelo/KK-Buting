import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import StatusBadge from '../../components/StatusBadge'
import StatusBanner from '../../components/StatusBanner'
import {
  getMerchantProfile,
  updateMerchantProfile,
  uploadMerchantAsset,
} from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { RootStackParamList } from '../../navigation/AppNavigator'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function ShopProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'banner' | null>(null)
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
      const profile = await updateMerchantProfile(user, form)
      setForm((current) => ({
        ...current,
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
      }))
      Alert.alert('Saved', 'Your shop profile has been updated in the shared merchant record.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      Alert.alert('Save failed', message)
    } finally {
      setSaving(false)
    }
  }

  const handlePickAsset = async (assetType: 'logo' | 'banner') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to upload your shop images.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: assetType === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
        base64: true,
      })

      if (result.canceled) {
        return
      }

      const asset = result.assets[0]
      if (!asset?.uri) {
        throw new Error('Missing image data from picker.')
      }

      setUploadingAsset(assetType)
      const targetWidth = assetType === 'logo' ? 480 : 960
      const resized = await manipulateAsync(
        asset.uri,
        [{ resize: { width: targetWidth } }],
        {
          compress: assetType === 'logo' ? 0.55 : 0.5,
          format: SaveFormat.JPEG,
          base64: true,
        }
      )

      if (!resized.base64) {
        throw new Error('Failed to prepare the selected image.')
      }

      const fileUrl = await uploadMerchantAsset(user, assetType, `data:image/jpeg;base64,${resized.base64}`)

      setForm((current) => ({
        ...current,
        ...(assetType === 'logo' ? { logoUrl: fileUrl } : { bannerUrl: fileUrl }),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please choose the image again.'
      Alert.alert('Upload failed', message)
    } finally {
      setUploadingAsset(null)
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
          <AssetField
            label="Shop logo"
            value={form.logoUrl}
            uploadLabel="Upload Logo"
            isUploading={uploadingAsset === 'logo'}
            onUpload={() => void handlePickAsset('logo')}
            onRemove={() => setForm((current) => ({ ...current, logoUrl: '' }))}
          />
          <AssetField
            label="Shop banner"
            value={form.bannerUrl}
            uploadLabel="Upload Banner"
            isUploading={uploadingAsset === 'banner'}
            onUpload={() => void handlePickAsset('banner')}
            onRemove={() => setForm((current) => ({ ...current, bannerUrl: '' }))}
          />
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
          {form.bannerUrl ? <Image source={{ uri: form.bannerUrl }} style={styles.previewBanner} /> : null}
          {form.logoUrl ? <Image source={{ uri: form.logoUrl }} style={styles.previewLogo} /> : null}
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

type AssetFieldProps = {
  label: string
  value: string
  uploadLabel: string
  isUploading: boolean
  onUpload: () => void
  onRemove: () => void
}

function AssetField({ label, value, uploadLabel, isUploading, onUpload, onRemove }: AssetFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.assetCard}>
        {value ? (
          <Image source={{ uri: value }} style={styles.assetPreview} />
        ) : (
          <View style={[styles.assetPreview, styles.assetPlaceholder]}>
            <Text style={styles.assetPlaceholderText}>No image uploaded yet</Text>
          </View>
        )}

        <View style={styles.assetActions}>
          <Pressable style={styles.assetButton} onPress={onUpload} disabled={isUploading}>
            {isUploading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.assetButtonText}>{uploadLabel}</Text>}
          </Pressable>
          {value ? (
            <Pressable style={styles.assetSecondaryButton} onPress={onRemove} disabled={isUploading}>
              <Text style={styles.assetSecondaryButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.assetHint}>Choose an image from your gallery. The uploaded file will be saved to your merchant profile.</Text>
      </View>
    </View>
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
  assetCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  assetPreview: {
    width: '100%',
    height: 168,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  assetPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  assetPlaceholderText: {
    color: '#64748b',
    fontWeight: '600',
  },
  assetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  assetButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  assetButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  assetSecondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
  },
  assetSecondaryButtonText: {
    color: '#475569',
    fontWeight: '700',
  },
  assetHint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: '#134e4a',
    borderRadius: 24,
    padding: 20,
    gap: 8,
  },
  previewBanner: {
    width: '100%',
    height: 140,
    borderRadius: 18,
    marginBottom: 8,
  },
  previewLogo: {
    width: 84,
    height: 84,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
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
