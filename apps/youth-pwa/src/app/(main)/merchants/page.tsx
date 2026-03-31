'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useMerchants } from '@/hooks/useMerchants'
import Spinner from '@/components/ui/Spinner'

export default function MerchantsPage() {
  const { merchants, isLoading, error } = useMerchants()
  const approved = merchants.filter((m) => m.status === 'approved')

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 sticky top-0 z-20 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900">Merchants</h1>
        <p className="text-gray-500 text-sm mt-0.5">Partner shops and businesses</p>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : error ? (
          <div className="text-center py-16 text-red-500 text-sm">{error}</div>
        ) : approved.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="text-gray-400 font-medium">No merchants yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approved.map((merchant) => (
              <Link
                key={merchant.id}
                href={`/merchants/${merchant.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {merchant.imageUrl ? (
                    <Image src={merchant.imageUrl} alt={merchant.name} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                  <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{merchant.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      {merchant.category}
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
