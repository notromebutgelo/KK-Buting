'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

interface Merchant {
  id: string
  name: string
  description: string
  category: string
  address: string
  status: 'pending' | 'approved' | 'rejected'
  ownerId: string
  ownerEmail?: string
  createdAt: string
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/merchants')
      .then((res) => setMerchants(res.data.merchants || res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = activeTab === 'all' ? merchants : merchants.filter((m) => m.status === activeTab)
  const counts = {
    all: merchants.length,
    pending: merchants.filter((m) => m.status === 'pending').length,
    approved: merchants.filter((m) => m.status === 'approved').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Merchants</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage partner merchants and approvals</p>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
            <span className={cn(
              'ml-1 px-1.5 py-0.5 rounded-full text-xs',
              activeTab === tab ? 'bg-blue-500' : 'bg-gray-100 text-gray-600'
            )}>
              {counts[tab as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No merchants found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Address</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Registered</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                      <p className="text-gray-500 text-xs line-clamp-1">{m.description}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 hidden md:table-cell">{m.category}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 hidden lg:table-cell line-clamp-1">{m.address}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                        'bg-yellow-100 text-yellow-700': m.status === 'pending',
                        'bg-green-100 text-green-700': m.status === 'approved',
                        'bg-red-100 text-red-600': m.status === 'rejected',
                      })}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                      {new Date(m.createdAt).toLocaleDateString('en-PH')}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/merchants/${m.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        {m.status === 'pending' ? 'Review' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
