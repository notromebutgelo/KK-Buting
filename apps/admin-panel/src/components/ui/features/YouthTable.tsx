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

  const filtered = members.filter((member) => {
    const matchSearch =
      !search ||
      member.UserName?.toLowerCase().includes(search.toLowerCase()) ||
      member.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || member.profile?.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by username or email..."
          className="flex-1 min-w-40 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--stroke)',
            background: 'var(--card-solid)',
            color: 'var(--ink)',
          }}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            borderColor: 'var(--stroke)',
            background: 'var(--card-solid)',
            color: 'var(--ink)',
          }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--stroke)' }}>
        <table className="w-full" style={{ background: 'var(--card-solid)' }}>
          <thead style={{ background: 'var(--surface-muted)' }}>
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium uppercase"
                style={{ color: 'var(--muted)' }}
              >
                Username
              </th>
              <th
                className="hidden px-4 py-3 text-left text-xs font-medium uppercase sm:table-cell"
                style={{ color: 'var(--muted)' }}
              >
                Email
              </th>
              <th
                className="hidden px-4 py-3 text-left text-xs font-medium uppercase lg:table-cell"
                style={{ color: 'var(--muted)' }}
              >
                Location
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium uppercase"
                style={{ color: 'var(--muted)' }}
              >
                Status
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--stroke)' }}>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm"
                  style={{ color: 'var(--muted)' }}
                >
                  No members found
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr
                  key={member.uid}
                  className="transition hover:bg-gray-50"
                >
                  <td
                    className="px-4 py-3 text-sm font-semibold"
                    style={{ color: 'var(--ink)' }}
                  >
                    {member.UserName}
                  </td>
                  <td
                    className="hidden px-4 py-3 text-sm sm:table-cell"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    {member.email}
                  </td>
                  <td
                    className="hidden px-4 py-3 text-sm lg:table-cell"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    {member.profile?.city
                      ? `${member.profile.city}, ${member.profile.province}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn('rounded-full px-2 py-0.5 text-xs font-medium', {
                        'bg-green-100 text-green-700': member.profile?.status === 'verified',
                        'bg-yellow-100 text-yellow-700': member.profile?.status === 'pending',
                        'bg-red-100 text-red-600': member.profile?.status === 'rejected',
                        'bg-gray-100 text-gray-600': !member.profile?.status,
                      })}
                    >
                      {member.profile?.status || 'No profile'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/youth/${member.uid}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
