'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'

interface Merchant {
  id: string
  name: string
  description: string
  category: string
  address: string
  imageUrl: string
  status: 'pending' | 'approved' | 'rejected'
  ownerId: string
  ownerEmail?: string
  ownerName?: string
  createdAt: string
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
      setMerchant((m) => m ? { ...m, status: 'approved' } : m)
      setMessage('Merchant approved successfully.')
    } catch {
      setMessage('Failed to approve merchant.')
    } finally {
      setIsApproving(false)
    }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!merchant) return <div className="text-center py-20 text-gray-500">Merchant not found.</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black text-gray-900 flex-1">{merchant.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          merchant.status === 'approved' ? 'bg-green-100 text-green-700' :
          merchant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-600'
        }`}>
          {merchant.status}
        </span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Image */}
      {merchant.imageUrl && (
        <div className="relative h-48 rounded-xl overflow-hidden bg-gray-100">
          <Image src={merchant.imageUrl} alt={merchant.name} fill className="object-cover" />
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        {[
          ['Name', merchant.name],
          ['Category', merchant.category],
          ['Description', merchant.description],
          ['Address', merchant.address],
          ['Owner Email', merchant.ownerEmail],
          ['Registered', new Date(merchant.createdAt).toLocaleDateString('en-PH')],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 text-sm w-36 flex-shrink-0">{label}</span>
            <span className="text-gray-900 text-sm font-medium flex-1">{value || '—'}</span>
          </div>
        ))}
      </div>

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
