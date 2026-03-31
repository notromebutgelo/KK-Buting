'use client'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/utils/cn'

interface YouthMember {
  uid: string
  UserName: string
  email: string
  createdAt: string
  profile?: {
    firstName: string
    lastName: string
    city: string
    province: string
    status: string
    youthAgeGroup: string
  }
}

interface YouthTableProps {
  members: YouthMember[]
}

export default function YouthTable({ members }: YouthTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = members.filter((m) => {
    const matchSearch = !search || m.UserName?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.profile?.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="flex-1 min-w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full bg-white">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No members found</td></tr>
            ) : filtered.map((m) => (
              <tr key={m.uid} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{m.UserName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{m.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                  {m.profile?.city ? `${m.profile.city}, ${m.profile.province}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', {
                    'bg-green-100 text-green-700': m.profile?.status === 'verified',
                    'bg-yellow-100 text-yellow-700': m.profile?.status === 'pending',
                    'bg-red-100 text-red-600': m.profile?.status === 'rejected',
                    'bg-gray-100 text-gray-600': !m.profile?.status,
                  })}>
                    {m.profile?.status || 'No profile'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/youth/${m.uid}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
