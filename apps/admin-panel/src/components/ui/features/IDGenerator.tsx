'use client'
import { useState } from 'react'
import api from '@/lib/api'

interface IDGeneratorProps {
  userId: string
  userName: string
  hasDigitalId: boolean
  onGenerated?: (memberId: string) => void
}

export default function IDGenerator({ userId, userName, hasDigitalId, onGenerated }: IDGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    try {
      const res = await api.post(`/admin/digital-ids/${userId}/generate`)
      const id = res.data.memberId || res.data.id
      setMemberId(id)
      onGenerated?.(id)
    } catch {
      setError('Failed to generate Digital ID.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="rounded-xl p-4 border shadow-sm"
      style={{ background: 'var(--card-solid)', borderColor: 'var(--stroke)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{userName}</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Digital ID Management</p>
        </div>
      </div>

      {memberId ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-green-800 font-semibold text-sm">Digital ID Generated!</p>
          <p className="font-mono text-green-700 font-bold mt-1">{memberId}</p>
        </div>
      ) : hasDigitalId ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-blue-700 text-sm font-medium">Digital ID is active</p>
        </div>
      ) : (
        <>
          {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {isGenerating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Generate Digital ID
          </button>
        </>
      )}
    </div>
  )
}
