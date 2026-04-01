'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'

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

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!merchant) return <div className="text-center py-20 text-gray-500">Merchant not found.</div>

  const heroImage = merchant.bannerUrl || merchant.imageUrl
  const statusClassName =
    merchant.status === 'approved'
      ? 'bg-green-100 text-green-700'
      : merchant.status === 'pending'
        ? 'bg-yellow-100 text-yellow-700'
        : merchant.status === 'suspended'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-red-100 text-red-600'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black text-gray-900 flex-1">{merchant.businessName || merchant.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClassName}`}>
          {merchant.status}
        </span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {heroImage && (
        <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
          <Image src={heroImage} alt={merchant.name} fill className="object-cover" />
        </div>
      )}

      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        {[
          ['Name', merchant.businessName || merchant.name],
          ['Category', merchant.category],
          ['Description', merchant.shortDescription || merchant.description],
          ['Address', merchant.address],
          ['Owner Name', merchant.ownerName],
          ['Owner Email', merchant.ownerEmail],
          ['Points Rate', merchant.pointsRate ? `PHP ${merchant.pointsRate} per point` : null],
          ['Registered', new Date(merchant.createdAt).toLocaleDateString('en-PH')],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 text-sm w-36 flex-shrink-0">{label}</span>
            <span className="text-gray-900 text-sm font-medium flex-1">{value || 'Not set'}</span>
          </div>
        ))}
      </div>

      {(merchant.businessInfo || merchant.discountInfo || merchant.termsAndConditions) && (
        <div className="grid gap-3">
          {merchant.businessInfo && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Business Info</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{merchant.businessInfo}</p>
            </div>
          )}
          {merchant.discountInfo && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Discount Info</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{merchant.discountInfo}</p>
            </div>
          )}
          {merchant.termsAndConditions && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-500">Terms & Conditions</p>
              <p className="mt-2 text-sm leading-6 text-gray-700">{merchant.termsAndConditions}</p>
            </div>
          )}
        </div>
      )}

      {merchant.promotions && merchant.promotions.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Promotions</h2>
            <span className="text-sm text-gray-500">{merchant.promotions.length} live entries</span>
          </div>
          <div className="space-y-3">
            {merchant.promotions.map((promotion) => (
              <div key={promotion.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{promotion.title}</p>
                    {promotion.shortTagline ? (
                      <p className="mt-1 text-sm text-gray-500">{promotion.shortTagline}</p>
                    ) : null}
                  </div>
                  {promotion.valueLabel ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      {promotion.valueLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  {promotion.startDate ? <span>Starts: {promotion.startDate}</span> : null}
                  {promotion.endDate ? <span>Ends: {promotion.endDate}</span> : null}
                  <span>{promotion.isActive === false ? 'Paused' : 'Active'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {merchant.products && merchant.products.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-gray-900">Products & Menu</h2>
            <span className="text-sm text-gray-500">{merchant.products.length} items</span>
          </div>
          <div className="space-y-3">
            {merchant.products.map((product) => (
              <div key={product.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    {product.description ? (
                      <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                    ) : null}
                    {product.category ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">{product.category}</p>
                    ) : null}
                  </div>
                  {typeof product.price === 'number' ? (
                    <p className="text-sm font-semibold text-gray-900">PHP {product.price.toFixed(2)}</p>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-gray-500">{product.isActive === false ? 'Hidden from youth app' : 'Visible in youth app'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {merchant.status === 'pending' && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isApproving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Approve Merchant
          </button>
        </div>
      )}
    </div>
  )
}
