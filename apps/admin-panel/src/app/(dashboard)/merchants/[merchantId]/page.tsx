'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import api from '@/lib/api'

interface Merchant {
  id: string
  name: string
  businessName?: string
  description: string
  shortDescription?: string
  category: string
  address: string
  imageUrl: string
  bannerUrl?: string
  logoUrl?: string
  businessInfo?: string
  discountInfo?: string
  termsAndConditions?: string
  pointsRate?: number
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  ownerId: string
  ownerEmail?: string
  ownerName?: string
  createdAt: string
  promotions?: Array<{
    id: string
    title: string
    shortTagline?: string
    valueLabel?: string
    startDate?: string
    endDate?: string
    isActive?: boolean
  }>
  products?: Array<{
    id: string
    name: string
    description?: string
    category?: string
    price?: number
    isActive?: boolean
  }>
}

export default function MerchantDetailPage() {
  const { merchantId } = useParams<{ merchantId: string }>()
  const router = useRouter()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.get(`/admin/merchants/${merchantId}`)
      .then((res) => setMerchant(res.data.merchant || res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [merchantId])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await api.patch(`/admin/merchants/${merchantId}/approve`)
      setMerchant((current) => current ? { ...current, status: 'approved' } : current)
      setMessage('Merchant approved successfully.')
    } catch {
      setMessage('Failed to approve merchant.')
    } finally {
      setIsApproving(false)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--accent)] border-t-transparent" />
    </div>
  )
  if (!merchant) return (
    <div className="py-20 text-center text-sm" style={{ color: 'var(--muted)' }}>Merchant not found.</div>
  )

  const heroImage = merchant.bannerUrl || merchant.imageUrl
  const statusClass =
    merchant.status === 'approved' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]'
    : merchant.status === 'pending' ? 'bg-amber-50 text-amber-700'
    : merchant.status === 'suspended' ? 'bg-orange-50 text-orange-700'
    : 'bg-red-50 text-red-700'

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-9 w-9 place-items-center rounded-xl border transition-colors hover:bg-[color:var(--accent-soft)]"
          style={{ borderColor: 'var(--stroke)', color: 'var(--muted)' }}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="flex-1 text-xl font-bold" style={{ color: 'var(--ink)' }}>
          {merchant.businessName || merchant.name}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
          {merchant.status}
        </span>
      </div>

      {message && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: message.includes('Failed') ? '#fecaca' : 'var(--stroke)',
            background: message.includes('Failed') ? '#fef2f2' : 'var(--accent-soft)',
            color: message.includes('Failed') ? '#dc2626' : 'var(--accent-strong)',
          }}
        >
          {message}
        </div>
      )}

      {heroImage && (
        <div className="relative h-48 overflow-hidden rounded-[var(--radius-md)]" style={{ background: 'var(--surface-muted)' }}>
          <Image src={heroImage} alt={merchant.name} fill className="object-cover" />
        </div>
      )}

      <div className="admin-panel flex flex-col gap-0">
        {[
          ['Name', merchant.businessName || merchant.name],
          ['Category', merchant.category],
          ['Description', merchant.shortDescription || merchant.description],
          ['Address', merchant.address],
          ['Owner Name', merchant.ownerName],
          ['Owner Email', merchant.ownerEmail],
          ['Points Rate', merchant.pointsRate ? `PHP ${merchant.pointsRate} per point` : null],
          ['Registered', new Date(merchant.createdAt).toLocaleDateString('en-PH')],
        ].map(([label, value], i, arr) => (
          <div
            key={label}
            className={`flex items-start gap-4 py-2.5 ${i < arr.length - 1 ? 'border-b' : ''}`}
            style={{ borderColor: 'var(--stroke)' }}
          >
            <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</span>
            <span className="flex-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{value || 'Not set'}</span>
          </div>
        ))}
      </div>

      {(merchant.businessInfo || merchant.discountInfo || merchant.termsAndConditions) && (
        <div className="flex flex-col gap-3">
          {merchant.businessInfo && (
            <div className="admin-card">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Business Info</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>{merchant.businessInfo}</p>
            </div>
          )}
          {merchant.discountInfo && (
            <div className="admin-card">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Discount Info</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>{merchant.discountInfo}</p>
            </div>
          )}
          {merchant.termsAndConditions && (
            <div className="admin-card">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Terms & Conditions</p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-soft)' }}>{merchant.termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {merchant.promotions && merchant.promotions.length > 0 && (
        <div className="admin-panel flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Promotions</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{merchant.promotions.length} live entries</span>
          </div>
          <div className="flex flex-col gap-3">
            {merchant.promotions.map((promotion) => (
              <div key={promotion.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{promotion.title}</p>
                    {promotion.shortTagline && <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{promotion.shortTagline}</p>}
                  </div>
                  {promotion.valueLabel && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{promotion.valueLabel}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {promotion.startDate && <span>Starts: {promotion.startDate}</span>}
                  {promotion.endDate && <span>Ends: {promotion.endDate}</span>}
                  <span>{promotion.isActive === false ? 'Paused' : 'Active'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {merchant.products && merchant.products.length > 0 && (
        <div className="admin-panel flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold" style={{ color: 'var(--ink)' }}>Products & Menu</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{merchant.products.length} items</span>
          </div>
          <div className="flex flex-col gap-3">
            {merchant.products.map((product) => (
              <div key={product.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--stroke)', background: 'var(--surface-muted)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{product.name}</p>
                    {product.description && <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{product.description}</p>}
                    {product.category && <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{product.category}</p>}
                  </div>
                  {typeof product.price === 'number' && (
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>PHP {product.price.toFixed(2)}</p>
                  )}
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{product.isActive === false ? 'Hidden from youth app' : 'Visible in youth app'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {merchant.status === 'pending' && (
        <div className="admin-card">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--accent)' }}
          >
            {isApproving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            Approve Merchant
          </button>
        </div>
      )}
    </div>
  )
}
