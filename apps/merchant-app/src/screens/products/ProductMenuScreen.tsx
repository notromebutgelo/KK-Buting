import React, { useEffect, useState } from 'react'
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

import {
  deleteMerchantProduct,
  getMerchantProducts,
  saveMerchantProduct,
} from '../../services/merchantWorkspace.service'
import { useAuthStore } from '../../store/authStore'
import type { MerchantProduct } from '../../types/merchant'
import { formatCurrency } from '../../utils/merchant'

export default function ProductMenuScreen() {
  const navigation = useNavigation()
  const user = useAuthStore((state) => state.user)
  const [products, setProducts] = useState<MerchantProduct[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    imageUrl: '',
    isActive: true,
  })

  const loadProducts = async () => {
    const items = await getMerchantProducts(user)
    setProducts(items)
  }

  useEffect(() => {
    void loadProducts()
  }, [user])

  const resetForm = () => {
    setSelectedId(null)
    setForm({
      name: '',
      price: '',
      category: '',
      description: '',
      imageUrl: '',
      isActive: true,
    })
  }

  const handleSelect = (product: MerchantProduct) => {
    setSelectedId(product.id)
    setForm({
      name: product.name,
      price: String(product.price),
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
    })
  }

  const handleSave = async () => {
    try {
      await saveMerchantProduct(user, {
        id: selectedId || undefined,
        name: form.name,
        price: Number(form.price || 0),
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        isActive: form.isActive,
      })
      await loadProducts()
      resetForm()
    } catch {
      Alert.alert('Save failed', 'Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await deleteMerchantProduct(user, selectedId)
    await loadProducts()
    resetForm()
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
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#014384" />
            <Text style={styles.back}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Products & Menu</Text>
          <Text style={styles.subtitle}>Manage the items that appear in the merchant directory and promo flows.</Text>
        </View>

        <View style={styles.grid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={[styles.productCard, selectedId === product.id && styles.selectedCard]}
              onPress={() => handleSelect(product)}
            >
              <View style={styles.cardTop}>
                <View style={styles.productIcon}>
                  <MaterialCommunityIcons name="food-outline" size={20} color="#014384" />
                </View>
                <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>{product.category}</Text>
              <Text style={styles.productMeta}>{product.isActive ? 'Visible in list' : 'Hidden from list'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.editor}>
          <Text style={styles.sectionTitle}>{selectedId ? 'Edit Product' : 'New Product'}</Text>
          <Field label="Product name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <View style={styles.row}>
            <Field
              compact
              label="Price"
              value={form.price}
              keyboardType="decimal-pad"
              onChangeText={(value) => setForm((current) => ({ ...current, price: value }))}
            />
            <Field compact label="Category" value={form.category} onChangeText={(value) => setForm((current) => ({ ...current, category: value }))} />
          </View>
          <Field
            label="Description"
            value={form.description}
            onChangeText={(value) => setForm((current) => ({ ...current, description: value }))}
            multiline
          />
          <Field label="Image URL" value={form.imageUrl} onChangeText={(value) => setForm((current) => ({ ...current, imageUrl: value }))} />

          <Pressable
            style={[styles.toggleRow, form.isActive && styles.toggleRowActive]}
            onPress={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
          >
            <Text style={[styles.toggleText, form.isActive && styles.toggleTextActive]}>
              {form.isActive ? 'Product is visible' : 'Product is hidden'}
            </Text>
          </Pressable>

          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonText}>{selectedId ? 'Update Product' : 'Create Product'}</Text>
            </Pressable>
            {selectedId ? (
              <Pressable style={styles.secondaryButton} onPress={handleDelete}>
                <Text style={styles.secondaryButtonText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

type FieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  multiline?: boolean
  keyboardType?: 'default' | 'decimal-pad'
  compact?: boolean
}

function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
  compact = false,
}: FieldProps) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
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
    backgroundColor: '#f0f0f0',
  },
  keyboardShell: {
    flex: 1,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },
  hero: {
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  back: {
    color: '#014384',
    fontWeight: '800',
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
  grid: {
    gap: 10,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(1, 67, 132, 0.08)',
  },
  selectedCard: {
    borderColor: 'rgba(1, 67, 132, 0.24)',
    backgroundColor: '#f8fbff',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eef4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    color: '#014384',
    fontWeight: '800',
    fontSize: 16,
  },
  productPrice: {
    color: '#9c6500',
    fontSize: 20,
    fontWeight: '900',
  },
  productMeta: {
    color: '#6a7f98',
    fontSize: 12,
  },
  editor: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
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
  compactField: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleRow: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#eef4fb',
  },
  toggleRowActive: {
    backgroundColor: '#fff4d8',
  },
  toggleText: {
    color: '#4f647e',
    fontWeight: '800',
    textAlign: 'center',
  },
  toggleTextActive: {
    color: '#9c6500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#014384',
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
    backgroundColor: '#fff1ef',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#b42318',
    fontWeight: '800',
  },
})
