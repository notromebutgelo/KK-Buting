'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ImageIcon,
  MapPin,
  Megaphone,
  Package,
  Pencil,
  Save,
  Store,
  Trash2,
  Upload,
} from 'lucide-react'
import api from '@/lib/api'
import { prepareMerchantImage } from '@/lib/merchant-images'
import { cn } from '@/utils/cn'

type CmsTab = 'profile' | 'media' | 'catalog' | 'promotions'
type AssetType = 'logo' | 'banner' | 'gallery' | 'product' | 'promotion'

interface MerchantProduct {
  id: string
  name: string
  description?: string
  category?: string
  price?: number
  imageUrl?: string
  itemType?: 'product' | 'service'
  isActive?: boolean
}

interface MerchantPromotion {
  id: string
  title: string
  shortTagline?: string
  bannerUrl?: string
  valueLabel?: string
  startDate?: string
  endDate?: string
  type?: string
  availability?: string
  terms?: string[]
  isActive?: boolean
}

interface Merchant {
  id: string
  name: string
  businessName?: string
  description?: string
  shortDescription?: string
  category?: string
  address?: string
  locationDetails?: string
  contactNumber?: string
  email?: string
  websiteUrl?: string
  facebookUrl?: string
  mapUrl?: string
  operatingHours?: string
  imageUrl?: string
  bannerUrl?: string
  logoUrl?: string
  galleryUrls?: string[]
  businessInfo?: string
  discountInfo?: string
  termsAndConditions?: string
  pointsPolicy?: string
  pointsRate?: number
  isFeatured?: boolean
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  ownerEmail?: string
  ownerName?: string
  products?: MerchantProduct[]
  promotions?: MerchantPromotion[]
}

interface ProfileDraft {
  businessName: string
  category: string
  shortDescription: string
  businessInfo: string
  address: string
  locationDetails: string
  contactNumber: string
  email: string
  websiteUrl: string
  facebookUrl: string
  mapUrl: string
  operatingHours: string
  discountInfo: string
  pointsPolicy: string
  termsAndConditions: string
  pointsRate: string
  isFeatured: boolean
}

interface ProductDraft {
  id?: string
  name: string
  description: string
  category: string
  price: string
  imageUrl: string
  itemType: 'product' | 'service'
  isActive: boolean
}

interface PromotionDraft {
  id?: string
  title: string
  shortTagline: string
  bannerUrl: string
  valueLabel: string
  startDate: string
  endDate: string
  type: string
  availability: string
  terms: string
  isActive: boolean
}

const inputClass =
  'w-full rounded-xl border bg-[var(--card-solid)] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)]/30'

const emptyProduct: ProductDraft = {
  name: '',
  description: '',
  category: '',
  price: '',
  imageUrl: '',
  itemType: 'product',
  isActive: true,
}

const emptyPromotion: PromotionDraft = {
  title: '',
  shortTagline: '',
  bannerUrl: '',
  valueLabel: '',
  startDate: '',
  endDate: '',
  type: 'discount',
  availability: 'in-store',
  terms: '',
  isActive: true,
}

function createProfileDraft(merchant: Merchant): ProfileDraft {
  return {
    businessName: merchant.businessName || merchant.name || '',
    category: merchant.category || '',
    shortDescription: merchant.shortDescription || merchant.description || '',
    businessInfo: merchant.businessInfo || '',
    address: merchant.address || '',
    locationDetails: merchant.locationDetails || '',
    contactNumber: merchant.contactNumber || '',
    email: merchant.email || '',
    websiteUrl: merchant.websiteUrl || '',
    facebookUrl: merchant.facebookUrl || '',
    mapUrl: merchant.mapUrl || '',
    operatingHours: merchant.operatingHours || '',
    discountInfo: merchant.discountInfo || '',
    pointsPolicy: merchant.pointsPolicy || '',
    termsAndConditions: merchant.termsAndConditions || '',
    pointsRate: String(merchant.pointsRate || 10),
    isFeatured: merchant.isFeatured === true,
  }
}

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error || error?.message || fallback
}

export default function MerchantContentManagerPage() {
  const { merchantId } = useParams<{ merchantId: string }>()
  const router = useRouter()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [profile, setProfile] = useState<ProfileDraft | null>(null)
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct)
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>(emptyPromotion)
  const [activeTab, setActiveTab] = useState<CmsTab>('profile')
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState<AssetType | null>(null)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function loadMerchant() {
    const response = await api.get(`/admin/merchants/${merchantId}`)
    const nextMerchant = (response.data.merchant || response.data) as Merchant
    setMerchant(nextMerchant)
    setProfile(createProfileDraft(nextMerchant))
  }

  useEffect(() => {
    let mounted = true

    void Promise.all([api.get(`/admin/merchants/${merchantId}`), api.get('/auth/me')])
      .then(([merchantResponse, meResponse]) => {
        if (!mounted) return
        const nextMerchant = (merchantResponse.data.merchant || merchantResponse.data) as Merchant
        setMerchant(nextMerchant)
        setProfile(createProfileDraft(nextMerchant))
        setIsSuperadmin(meResponse.data?.role === 'superadmin')
      })
      .catch(() => {
        if (mounted) setMerchant(null)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [merchantId])

  function showMessage(text: string, error = false) {
    setMessage(text)
    setIsError(error)
  }

  async function saveProfile() {
    if (!profile || !merchant) return
    const businessName = profile.businessName.trim()
    const pointsRate = Number(profile.pointsRate)
    if (!businessName) return showMessage('Business name is required.', true)
    if (!Number.isFinite(pointsRate) || pointsRate <= 0) {
      return showMessage('Points rate must be greater than zero.', true)
    }

    setIsSaving(true)
    showMessage('')
    try {
      await api.patch(`/admin/merchants/${merchant.id}`, {
        ...profile,
        name: businessName,
        businessName,
        description: profile.shortDescription.trim(),
        shortDescription: profile.shortDescription.trim(),
        pointsRate,
      })
      await loadMerchant()
      showMessage('Storefront information saved.')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to save storefront information.'), true)
    } finally {
      setIsSaving(false)
    }
  }

  async function uploadAsset(assetType: AssetType, file: File) {
    if (!merchant || !isSuperadmin) return ''
    setUploadingAsset(assetType)
    showMessage('')
    try {
      const maxDimension = assetType === 'logo' ? 900 : 1800
      const fileData = await prepareMerchantImage(file, maxDimension)
      const response = await api.post(`/admin/merchants/${merchant.id}/assets`, {
        assetType,
        fileData,
      })
      if (['logo', 'banner', 'gallery'].includes(assetType)) {
        await loadMerchant()
      }
      showMessage('Image uploaded successfully.')
      return String(response.data.fileUrl || '')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to upload image.'), true)
      return ''
    } finally {
      setUploadingAsset(null)
    }
  }

  async function removeAsset(assetType: 'logo' | 'banner' | 'gallery', fileUrl?: string) {
    if (!merchant || !isSuperadmin) return
    setUploadingAsset(assetType)
    showMessage('')
    try {
      await api.delete(`/admin/merchants/${merchant.id}/assets`, {
        data: { assetType, fileUrl },
      })
      await loadMerchant()
      showMessage('Image removed.')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to remove image.'), true)
    } finally {
      setUploadingAsset(null)
    }
  }

  async function saveProduct() {
    if (!merchant) return
    if (!productDraft.name.trim()) return showMessage('Product or service name is required.', true)
    const price = Number(productDraft.price || 0)
    if (!Number.isFinite(price) || price < 0) return showMessage('Price must be zero or greater.', true)

    setIsSaving(true)
    showMessage('')
    const payload = {
      name: productDraft.name.trim(),
      description: productDraft.description.trim(),
      category: productDraft.category.trim(),
      price,
      imageUrl: productDraft.imageUrl,
      itemType: productDraft.itemType,
      isActive: productDraft.isActive,
    }
    try {
      if (productDraft.id) {
        await api.patch(`/admin/merchants/${merchant.id}/products/${productDraft.id}`, payload)
      } else {
        await api.post(`/admin/merchants/${merchant.id}/products`, payload)
      }
      setProductDraft(emptyProduct)
      await loadMerchant()
      showMessage(`${productDraft.itemType === 'service' ? 'Service' : 'Product'} saved.`)
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to save product or service.'), true)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteProduct(productId: string) {
    if (!merchant || !window.confirm('Remove this product or service from the storefront?')) return
    setIsSaving(true)
    try {
      await api.delete(`/admin/merchants/${merchant.id}/products/${productId}`)
      if (productDraft.id === productId) setProductDraft(emptyProduct)
      await loadMerchant()
      showMessage('Product or service removed.')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to remove product or service.'), true)
    } finally {
      setIsSaving(false)
    }
  }

  async function savePromotion() {
    if (!merchant) return
    if (!promotionDraft.title.trim()) return showMessage('Promotion title is required.', true)

    setIsSaving(true)
    showMessage('')
    const payload = {
      title: promotionDraft.title.trim(),
      shortTagline: promotionDraft.shortTagline.trim(),
      bannerUrl: promotionDraft.bannerUrl,
      valueLabel: promotionDraft.valueLabel.trim(),
      startDate: promotionDraft.startDate,
      endDate: promotionDraft.endDate,
      type: promotionDraft.type,
      availability: promotionDraft.availability.trim(),
      terms: promotionDraft.terms.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      isActive: promotionDraft.isActive,
    }
    try {
      if (promotionDraft.id) {
        await api.patch(`/admin/merchants/${merchant.id}/promotions/${promotionDraft.id}`, payload)
      } else {
        await api.post(`/admin/merchants/${merchant.id}/promotions`, payload)
      }
      setPromotionDraft(emptyPromotion)
      await loadMerchant()
      showMessage('Promotion saved.')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to save promotion.'), true)
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePromotion(promotionId: string) {
    if (!merchant || !window.confirm('Remove this promotion from the storefront?')) return
    setIsSaving(true)
    try {
      await api.delete(`/admin/merchants/${merchant.id}/promotions/${promotionId}`)
      if (promotionDraft.id === promotionId) setPromotionDraft(emptyPromotion)
      await loadMerchant()
      showMessage('Promotion removed.')
    } catch (error: any) {
      showMessage(getErrorMessage(error, 'Failed to remove promotion.'), true)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="mx-auto mt-24 h-7 w-7 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
  }

  if (!merchant || !profile) {
    return <div className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>Merchant not found.</div>
  }

  const tabs: Array<{ id: CmsTab; label: string; icon: typeof Store }> = [
    { id: 'profile', label: 'Storefront', icon: Store },
    { id: 'media', label: 'Images', icon: ImageIcon },
    { id: 'catalog', label: 'Products & services', icon: Package },
    { id: 'promotions', label: 'Promotions', icon: Megaphone },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-xl border"
          style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-strong)' }}>
            Merchant storefront CMS
          </p>
          <h1 className="truncate text-2xl font-bold" style={{ color: 'var(--ink)' }}>
            {merchant.businessName || merchant.name}
          </h1>
        </div>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold capitalize text-[var(--accent-strong)]">
          {merchant.status}
        </span>
      </div>

      {!isSuperadmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Full storefront content management is restricted to Super Admins.
        </div>
      ) : null}

      {message ? (
        <div className={cn('rounded-2xl border px-4 py-3 text-sm', isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
          {message}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-[var(--card-solid)] p-2" style={{ borderColor: 'var(--stroke)' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold',
              activeTab === id ? 'bg-[var(--accent)] text-white' : 'text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]'
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? (
        <section className="admin-panel">
          <SectionHeading title="Storefront information" description="Control the business identity, contact details, location, hours, and customer-facing copy." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Business name"><input value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} className={inputClass} /></Field>
            <Field label="Category"><input value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })} className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Short description" hint="Used on merchant cards and search results."><textarea rows={2} value={profile.shortDescription} onChange={(e) => setProfile({ ...profile, shortDescription: e.target.value })} className={inputClass} /></Field></div>
            <div className="md:col-span-2"><Field label="Business details"><textarea rows={4} value={profile.businessInfo} onChange={(e) => setProfile({ ...profile, businessInfo: e.target.value })} className={inputClass} /></Field></div>
            <div className="md:col-span-2"><Field label="Address"><input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className={inputClass} /></Field></div>
            <div className="md:col-span-2"><Field label="Location details" hint="Landmarks, floor, pickup instructions, or branch notes."><textarea rows={3} value={profile.locationDetails} onChange={(e) => setProfile({ ...profile, locationDetails: e.target.value })} className={inputClass} /></Field></div>
            <Field label="Contact number"><input type="tel" value={profile.contactNumber} onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })} className={inputClass} /></Field>
            <Field label="Public email"><input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} /></Field>
            <Field label="Website"><input type="url" value={profile.websiteUrl} onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })} className={inputClass} placeholder="https://" /></Field>
            <Field label="Facebook page"><input type="url" value={profile.facebookUrl} onChange={(e) => setProfile({ ...profile, facebookUrl: e.target.value })} className={inputClass} placeholder="https://" /></Field>
            <div className="md:col-span-2"><Field label="Map link"><div className="relative"><MapPin className="absolute left-3 top-3 text-[var(--muted)]" size={16} /><input type="url" value={profile.mapUrl} onChange={(e) => setProfile({ ...profile, mapUrl: e.target.value })} className={cn(inputClass, 'pl-9')} placeholder="Google Maps or other location link" /></div></Field></div>
            <div className="md:col-span-2"><Field label="Operating hours" hint="Enter one day or schedule per line."><textarea rows={4} value={profile.operatingHours} onChange={(e) => setProfile({ ...profile, operatingHours: e.target.value })} className={inputClass} placeholder={'Monday-Friday: 9:00 AM-8:00 PM\nSaturday-Sunday: 10:00 AM-6:00 PM'} /></Field></div>
            <Field label="Discount information"><textarea rows={4} value={profile.discountInfo} onChange={(e) => setProfile({ ...profile, discountInfo: e.target.value })} className={inputClass} /></Field>
            <Field label="Points policy"><textarea rows={4} value={profile.pointsPolicy} onChange={(e) => setProfile({ ...profile, pointsPolicy: e.target.value })} className={inputClass} /></Field>
            <div className="md:col-span-2"><Field label="Terms and conditions" hint="Enter one condition per line."><textarea rows={4} value={profile.termsAndConditions} onChange={(e) => setProfile({ ...profile, termsAndConditions: e.target.value })} className={inputClass} /></Field></div>
            <Field label="Points rate" hint="Peso amount required to earn one point."><input type="number" min="0.01" step="0.01" value={profile.pointsRate} onChange={(e) => setProfile({ ...profile, pointsRate: e.target.value })} className={inputClass} /></Field>
            <label className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--stroke)' }}>
              <input type="checkbox" checked={profile.isFeatured} onChange={(e) => setProfile({ ...profile, isFeatured: e.target.checked })} className="h-4 w-4" />
              <span><span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Featured merchant</span><span className="block text-xs" style={{ color: 'var(--muted)' }}>Prioritize this merchant in Youth PWA listings.</span></span>
            </label>
          </div>
          <div className="mt-5 flex justify-end border-t pt-4" style={{ borderColor: 'var(--stroke)' }}>
            <PrimaryButton disabled={!isSuperadmin || isSaving} onClick={() => void saveProfile()} icon={Save}>{isSaving ? 'Saving...' : 'Save storefront'}</PrimaryButton>
          </div>
        </section>
      ) : null}

      {activeTab === 'media' ? (
        <section className="admin-panel">
          <SectionHeading title="Storefront images" description="Upload and replace images directly. No external image URLs are required." />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <AssetEditor label="Business logo" description="Square image recommended." src={merchant.logoUrl} assetType="logo" disabled={!isSuperadmin} loading={uploadingAsset === 'logo'} onUpload={uploadAsset} onRemove={removeAsset} className="aspect-square max-h-64" />
            <AssetEditor label="Featured storefront banner" description="Wide image used on merchant cards and the shop header." src={merchant.bannerUrl || merchant.imageUrl} assetType="banner" disabled={!isSuperadmin} loading={uploadingAsset === 'banner'} onUpload={uploadAsset} onRemove={removeAsset} className="aspect-[16/8] max-h-64" />
          </div>
          <div className="mt-7 border-t pt-5" style={{ borderColor: 'var(--stroke)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHeading title="Gallery photos" description="Show products, the storefront, menu highlights, and other merchant photos." />
              <UploadButton disabled={!isSuperadmin || uploadingAsset === 'gallery'} label={uploadingAsset === 'gallery' ? 'Uploading...' : 'Add gallery photo'} onSelect={(file) => void uploadAsset('gallery', file)} />
            </div>
            {(merchant.galleryUrls || []).length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {merchant.galleryUrls!.map((url) => (
                  <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}>
                    <img src={url} alt="Merchant gallery" className="h-full w-full object-cover" />
                    <button type="button" disabled={!isSuperadmin} onClick={() => void removeAsset('gallery', url)} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-red-600 shadow disabled:hidden" aria-label="Remove gallery photo"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyContent icon={ImageIcon} title="No gallery photos yet" description="Upload photos to make the Youth PWA storefront more visual." />
            )}
          </div>
        </section>
      ) : null}

      {activeTab === 'catalog' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="admin-panel">
            <SectionHeading title="Products and services" description="Everything active here appears on the Youth PWA merchant page." />
            {(merchant.products || []).length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {merchant.products!.map((product) => (
                  <ContentCard key={product.id} imageUrl={product.imageUrl} title={product.name} subtitle={`${product.itemType === 'service' ? 'Service' : 'Product'}${product.category ? ` · ${product.category}` : ''}`} badge={typeof product.price === 'number' ? `PHP ${product.price.toFixed(2)}` : undefined} active={product.isActive !== false} onEdit={() => setProductDraft({ id: product.id, name: product.name, description: product.description || '', category: product.category || '', price: String(product.price || 0), imageUrl: product.imageUrl || '', itemType: product.itemType || 'product', isActive: product.isActive !== false })} onDelete={() => void deleteProduct(product.id)} />
                ))}
              </div>
            ) : <EmptyContent icon={Package} title="No products or services" description="Create the first catalog item using the editor." />}
          </section>
          <section className="admin-panel xl:sticky xl:top-6 xl:self-start">
            <SectionHeading title={productDraft.id ? 'Edit catalog item' : 'Add catalog item'} description="Use Product or Service to organize what this merchant offers." />
            <div className="mt-5 space-y-4">
              <Field label="Item type"><select value={productDraft.itemType} onChange={(e) => setProductDraft({ ...productDraft, itemType: e.target.value as ProductDraft['itemType'] })} className={inputClass}><option value="product">Product</option><option value="service">Service</option></select></Field>
              <Field label="Name"><input value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} className={inputClass} /></Field>
              <Field label="Category"><input value={productDraft.category} onChange={(e) => setProductDraft({ ...productDraft, category: e.target.value })} className={inputClass} /></Field>
              <Field label="Price"><input type="number" min="0" step="0.01" value={productDraft.price} onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })} className={inputClass} /></Field>
              <Field label="Description"><textarea rows={4} value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} className={inputClass} /></Field>
              <DraftImageEditor src={productDraft.imageUrl} loading={uploadingAsset === 'product'} disabled={!isSuperadmin} onUpload={async (file) => { const url = await uploadAsset('product', file); if (url) setProductDraft((current) => ({ ...current, imageUrl: url })) }} onRemove={() => setProductDraft({ ...productDraft, imageUrl: '' })} />
              <VisibilityToggle checked={productDraft.isActive} onChange={(isActive) => setProductDraft({ ...productDraft, isActive })} />
              <div className="flex gap-2 border-t pt-4" style={{ borderColor: 'var(--stroke)' }}>
                {productDraft.id ? <SecondaryButton onClick={() => setProductDraft(emptyProduct)}>Cancel</SecondaryButton> : null}
                <PrimaryButton disabled={!isSuperadmin || isSaving} onClick={() => void saveProduct()} icon={Save}>{productDraft.id ? 'Update item' : 'Add item'}</PrimaryButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'promotions' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="admin-panel">
            <SectionHeading title="Promotional content" description="Create banners, featured offers, dates, labels, and customer terms." />
            {(merchant.promotions || []).length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {merchant.promotions!.map((promotion) => (
                  <ContentCard key={promotion.id} imageUrl={promotion.bannerUrl} title={promotion.title} subtitle={promotion.shortTagline || promotion.type || 'Promotion'} badge={promotion.valueLabel} active={promotion.isActive !== false} onEdit={() => setPromotionDraft({ id: promotion.id, title: promotion.title, shortTagline: promotion.shortTagline || '', bannerUrl: promotion.bannerUrl || '', valueLabel: promotion.valueLabel || '', startDate: promotion.startDate || '', endDate: promotion.endDate || '', type: promotion.type || 'discount', availability: promotion.availability || 'in-store', terms: (promotion.terms || []).join('\n'), isActive: promotion.isActive !== false })} onDelete={() => void deletePromotion(promotion.id)} />
                ))}
              </div>
            ) : <EmptyContent icon={Megaphone} title="No promotions yet" description="Create a promotion and upload its banner using the editor." />}
          </section>
          <section className="admin-panel xl:sticky xl:top-6 xl:self-start">
            <SectionHeading title={promotionDraft.id ? 'Edit promotion' : 'Add promotion'} description="Active promotions are displayed on the Youth PWA storefront." />
            <div className="mt-5 space-y-4">
              <Field label="Title"><input value={promotionDraft.title} onChange={(e) => setPromotionDraft({ ...promotionDraft, title: e.target.value })} className={inputClass} /></Field>
              <Field label="Short tagline"><input value={promotionDraft.shortTagline} onChange={(e) => setPromotionDraft({ ...promotionDraft, shortTagline: e.target.value })} className={inputClass} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Offer type"><select value={promotionDraft.type} onChange={(e) => setPromotionDraft({ ...promotionDraft, type: e.target.value })} className={inputClass}><option value="discount">Discount</option><option value="freebie">Freebie</option><option value="bundle">Bundle</option><option value="points">Points offer</option></select></Field>
                <Field label="Value label"><input value={promotionDraft.valueLabel} onChange={(e) => setPromotionDraft({ ...promotionDraft, valueLabel: e.target.value })} className={inputClass} placeholder="20% off" /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date"><input type="date" value={promotionDraft.startDate} onChange={(e) => setPromotionDraft({ ...promotionDraft, startDate: e.target.value })} className={inputClass} /></Field>
                <Field label="End date"><input type="date" value={promotionDraft.endDate} onChange={(e) => setPromotionDraft({ ...promotionDraft, endDate: e.target.value })} className={inputClass} /></Field>
              </div>
              <Field label="Availability"><input value={promotionDraft.availability} onChange={(e) => setPromotionDraft({ ...promotionDraft, availability: e.target.value })} className={inputClass} placeholder="In-store, dine-in, pickup..." /></Field>
              <Field label="Promotion terms" hint="Enter one term per line."><textarea rows={4} value={promotionDraft.terms} onChange={(e) => setPromotionDraft({ ...promotionDraft, terms: e.target.value })} className={inputClass} /></Field>
              <DraftImageEditor label="Promotion banner" src={promotionDraft.bannerUrl} loading={uploadingAsset === 'promotion'} disabled={!isSuperadmin} onUpload={async (file) => { const url = await uploadAsset('promotion', file); if (url) setPromotionDraft((current) => ({ ...current, bannerUrl: url })) }} onRemove={() => setPromotionDraft({ ...promotionDraft, bannerUrl: '' })} />
              <VisibilityToggle checked={promotionDraft.isActive} onChange={(isActive) => setPromotionDraft({ ...promotionDraft, isActive })} />
              <div className="flex gap-2 border-t pt-4" style={{ borderColor: 'var(--stroke)' }}>
                {promotionDraft.id ? <SecondaryButton onClick={() => setPromotionDraft(emptyPromotion)}>Cancel</SecondaryButton> : null}
                <PrimaryButton disabled={!isSuperadmin || isSaving} onClick={() => void savePromotion()} icon={Save}>{promotionDraft.id ? 'Update promotion' : 'Add promotion'}</PrimaryButton>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div><h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>{title}</h2><p className="mt-1 text-sm leading-6" style={{ color: 'var(--muted)' }}>{description}</p></div>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{label}</span>{hint ? <span className="ml-2 text-[11px]" style={{ color: 'var(--muted)' }}>{hint}</span> : null}<div className="mt-1.5 [&_input]:border-[var(--stroke)] [&_select]:border-[var(--stroke)] [&_textarea]:border-[var(--stroke)]">{children}</div></label>
}

function UploadButton({ label, disabled, onSelect }: { label: string; disabled: boolean; onSelect: (file: File) => void }) {
  return <label className={cn('inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white', disabled && 'cursor-not-allowed opacity-50')}><Upload size={15} />{label}<input type="file" accept="image/*" disabled={disabled} className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) onSelect(file) }} /></label>
}

function AssetEditor({ label, description, src, assetType, disabled, loading, className, onUpload, onRemove }: { label: string; description: string; src?: string; assetType: 'logo' | 'banner'; disabled: boolean; loading: boolean; className: string; onUpload: (assetType: AssetType, file: File) => Promise<string>; onRemove: (assetType: 'logo' | 'banner') => Promise<void> }) {
  return <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--stroke)' }}><p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{label}</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{description}</p><div className={cn('mt-3 flex w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-muted)]', className)}>{src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-[var(--muted)]" />}</div><div className="mt-3 flex gap-2"><UploadButton disabled={disabled || loading} label={loading ? 'Uploading...' : src ? 'Replace image' : 'Upload image'} onSelect={(file) => void onUpload(assetType, file)} />{src ? <button type="button" disabled={disabled || loading} onClick={() => void onRemove(assetType)} className="grid h-10 w-10 place-items-center rounded-xl border text-red-600 disabled:opacity-50" style={{ borderColor: 'var(--stroke)' }}><Trash2 size={15} /></button> : null}</div></div>
}

function DraftImageEditor({ label = 'Item image', src, loading, disabled, onUpload, onRemove }: { label?: string; src: string; loading: boolean; disabled: boolean; onUpload: (file: File) => Promise<void>; onRemove: () => void }) {
  return <div><p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>{label}</p>{src ? <div className="relative mt-2 aspect-[16/8] overflow-hidden rounded-xl bg-[var(--surface-muted)]"><img src={src} alt={label} className="h-full w-full object-cover" /><button type="button" onClick={onRemove} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl bg-white/95 text-red-600 shadow"><Trash2 size={15} /></button></div> : null}<div className="mt-2"><UploadButton disabled={disabled || loading} label={loading ? 'Uploading...' : src ? 'Replace image' : 'Upload image'} onSelect={(file) => void onUpload(file)} /></div></div>
}

function VisibilityToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ borderColor: 'var(--stroke)' }}><span><span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>Visible in Youth PWA</span><span className="block text-xs" style={{ color: 'var(--muted)' }}>Turn off to keep this item as a draft.</span></span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" /></label>
}

function ContentCard({ imageUrl, title, subtitle, badge, active, onEdit, onDelete }: { imageUrl?: string; title: string; subtitle: string; badge?: string; active: boolean; onEdit: () => void; onDelete: () => void }) {
  return <article className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--stroke)', background: 'var(--card-solid)' }}><div className="flex h-32 items-center justify-center bg-[var(--surface-muted)]">{imageUrl ? <img src={imageUrl} alt={title} className="h-full w-full object-cover" /> : <ImageIcon size={22} className="text-[var(--muted)]" />}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</h3><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{subtitle}</p></div>{badge ? <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">{badge}</span> : null}</div><p className={cn('mt-3 text-[11px] font-semibold uppercase tracking-wider', active ? 'text-emerald-600' : 'text-slate-400')}>{active ? 'Visible' : 'Hidden'}</p><div className="mt-3 flex gap-2"><button type="button" onClick={onEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border text-xs font-semibold" style={{ borderColor: 'var(--stroke)', color: 'var(--ink)' }}><Pencil size={13} />Edit</button><button type="button" onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl border text-red-600" style={{ borderColor: 'var(--stroke)' }}><Trash2 size={13} /></button></div></div></article>
}

function EmptyContent({ icon: Icon, title, description }: { icon: typeof ImageIcon; title: string; description: string }) {
  return <div className="mt-5 rounded-2xl border border-dashed px-6 py-10 text-center" style={{ borderColor: 'var(--stroke)' }}><Icon className="mx-auto text-[var(--muted)]" size={25} /><p className="mt-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{title}</p><p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{description}</p></div>
}

function PrimaryButton({ children, disabled, onClick, icon: Icon }: { children: React.ReactNode; disabled: boolean; onClick: () => void; icon: typeof Save }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Icon size={15} />{children}</button>
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-10 rounded-xl border px-4 text-sm font-semibold" style={{ borderColor: 'var(--stroke)', color: 'var(--ink)' }}>{children}</button>
}
