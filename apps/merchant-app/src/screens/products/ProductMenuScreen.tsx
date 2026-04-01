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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Products & Menu</Text>
          <Text style={styles.subtitle}>Manage the items that will later appear in the merchant directory and promo flows.</Text>
        </View>

        <View style={styles.grid}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              style={[styles.productCard, selectedId === product.id && styles.selectedCard]}
              onPress={() => handleSelect(product)}
            >
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
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
  grid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  productName: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  productPrice: {
    color: '#ea580c',
    fontSize: 22,
    fontWeight: '900',
  },
  productMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  editor: {
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
