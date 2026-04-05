import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { MaterialCommunityIcons } from '@expo/vector-icons'

import StatusBadge from '../../components/StatusBadge'
import StatusBanner from '../../components/StatusBanner'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import {
  getMerchantProfile,
  updateMerchantProfile,
  uploadMerchantAsset,
} from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'

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
    pointsPolicy: '',
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
        pointsPolicy: profile.pointsPolicy,
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
        pointsPolicy: profile.pointsPolicy,
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
          <ActivityIndicator size="large" color="#014384" />
          <Text style={styles.loadingText}>Loading shop profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

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
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <Text style={styles.title}>My Shop</Text>
              <Text style={styles.subtitle}>
                Update the shared storefront content that youth members will see in the merchant directory.
              </Text>
            </View>
            <StatusBadge status={form.status} />
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Promotions')}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={18} color="#014384" />
              <Text style={styles.secondaryButtonText}>Promotions</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Products')}>
              <MaterialCommunityIcons name="food-outline" size={18} color="#014384" />
              <Text style={styles.secondaryButtonText}>Products</Text>
            </Pressable>
          </View>
          <StatusBanner status={form.status} message={form.adminNote} />
        </View>

        <View style={styles.previewCard}>
          {form.bannerUrl ? (
            <Image source={{ uri: form.bannerUrl }} style={styles.previewBanner} />
          ) : (
            <View style={[styles.previewBanner, styles.previewBannerPlaceholder]}>
              <MaterialCommunityIcons name="image-outline" size={24} color="#7d91aa" />
            </View>
          )}
          <View style={styles.previewHeader}>
            {form.logoUrl ? (
              <Image source={{ uri: form.logoUrl }} style={styles.previewLogo} />
            ) : (
              <View style={[styles.previewLogo, styles.previewLogoPlaceholder]}>
                <MaterialCommunityIcons name="storefront-outline" size={28} color="#014384" />
              </View>
            )}
            <View style={styles.previewTitleWrap}>
              <Text style={styles.previewName}>{form.businessName || 'Your shop name'}</Text>
              <Text style={styles.previewCategory}>{form.category || 'Category'}</Text>
            </View>
          </View>
          <Text style={styles.previewCopy}>{form.shortDescription || 'A short storefront description will appear here.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Business details</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Brand assets</Text>
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
          <Text style={styles.sectionTitle}>Youth-facing content</Text>
          <Field
            label="Points policy"
            value={form.pointsPolicy}
            onChangeText={(value) => setForm((current) => ({ ...current, pointsPolicy: value }))}
            multiline
          />
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

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Shop Profile'}</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
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
            <MaterialCommunityIcons name="image-outline" size={24} color="#7d91aa" />
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
    backgroundColor: '#f0f0f0',
  },
  keyboardShell: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#60748f',
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },
  hero: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
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
    color: '#014384',
  },
  subtitle: {
    color: '#60748f',
    lineHeight: 21,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#014384',
    fontWeight: '800',
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  previewBanner: {
    width: '100%',
    height: 140,
    borderRadius: 18,
  },
  previewBannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewLogo: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#ffffff',
  },
  previewLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef4fb',
  },
  previewTitleWrap: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    color: '#014384',
    fontSize: 22,
    fontWeight: '900',
  },
  previewCategory: {
    color: '#0572dc',
    fontWeight: '800',
  },
  previewCopy: {
    color: '#5e728b',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#014384',
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: '#35506d',
    fontWeight: '800',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fbff',
    color: '#0f172a',
  },
  multilineInput: {
    minHeight: 88,
  },
  assetCard: {
    borderWidth: 1,
    borderColor: '#d9e4f0',
    borderRadius: 18,
    padding: 12,
    gap: 12,
    backgroundColor: '#f8fbff',
  },
  assetPreview: {
    width: '100%',
    height: 158,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  assetPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
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
    backgroundColor: '#014384',
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
    borderColor: '#d9e4f0',
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
    color: '#7d91aa',
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: '#014384',
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
})
