'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

interface Reward {
  id: string
  title: string
  description: string
  points: number
  category: 'food' | 'services' | 'others'
  merchantName: string
  validDays: number
  createdAt: string
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/admin/rewards')
      .then((res) => setRewards(res.data.rewards || res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = rewards.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.merchantName?.toLowerCase().includes(search.toLowerCase())
  )

  const catColors = { food: 'bg-orange-100 text-orange-700', services: 'bg-blue-100 text-blue-700', others: 'bg-purple-100 text-purple-700' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rewards</h1>
          <p className="text-gray-500 text-sm mt-0.5">{rewards.length} rewards available</p>
        </div>
        <Link
          href="/rewards/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Reward
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rewards..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No rewards found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Merchant</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Points</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Valid Days</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                      <p className="text-gray-500 text-xs line-clamp-1">{r.description}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 hidden md:table-cell">{r.merchantName}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', catColors[r.category] || 'bg-gray-100 text-gray-600')}>
                        {r.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-blue-600 text-sm">{r.points.toLocaleString()}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 hidden md:table-cell">{r.validDays} days</td>
                    <td className="px-5 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(r.createdAt).toLocaleDateString('en-PH')}
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
