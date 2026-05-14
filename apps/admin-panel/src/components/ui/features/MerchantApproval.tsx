'use client'
import { useState } from 'react'
import Image from 'next/image'
import api from '@/lib/api'

interface Merchant {
  id: string
  name: string
  description: string
  category: string
  address: string
  imageUrl?: string
  status: 'pending' | 'approved' | 'rejected'
}

interface MerchantApprovalProps {
  merchant: Merchant
  onStatusChange?: (merchantId: string, status: string) => void
}

export default function MerchantApproval({ merchant, onStatusChange }: MerchantApprovalProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [message, setMessage] = useState('')

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await api.patch(`/admin/merchants/${merchant.id}/approve`)
      setMessage('Merchant approved.')
      onStatusChange?.(merchant.id, 'approved')
    } catch {
      setMessage('Failed to approve merchant.')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div
      className="rounded-xl border shadow-sm overflow-hidden"
      style={{ background: 'var(--card-solid)', borderColor: 'var(--stroke)' }}
    >
      {merchant.imageUrl && (
        <div className="relative h-36">
          <Image src={merchant.imageUrl} alt={merchant.name} fill className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold" style={{ color: 'var(--ink)' }}>{merchant.name}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
            merchant.status === 'approved' ? 'bg-green-100 text-green-700' :
            merchant.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-600'
          }`}>
            {merchant.status}
          </span>
        </div>
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{merchant.category}</p>
        <p className="text-sm line-clamp-2" style={{ color: 'var(--ink-soft)' }}>{merchant.description}</p>
        {merchant.address && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{merchant.address}</p>
        )}

        {message && (
          <div className={`mt-3 p-2 rounded-lg text-xs ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        {merchant.status === 'pending' && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="mt-3 w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {isApproving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Approve Merchant
          </button>
        )}
      </div>
    </div>
  )
}
