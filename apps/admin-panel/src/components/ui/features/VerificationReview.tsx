'use client'
import { useState } from 'react'
import api from '@/lib/api'

interface Profile {
  userId: string
  firstName: string
  lastName: string
  email: string
  status: 'pending' | 'verified' | 'rejected'
  idPhotoUrl?: string
  [key: string]: unknown
}

interface VerificationReviewProps {
  profile: Profile
  onStatusChange?: (userId: string, status: string) => void
}

export default function VerificationReview({ profile, onStatusChange }: VerificationReviewProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [message, setMessage] = useState('')

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await api.patch(`/admin/verification/${profile.userId}/approve`)
      setMessage('Profile approved successfully.')
      onStatusChange?.(profile.userId, 'verified')
    } catch {
      setMessage('Failed to approve profile.')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setIsRejecting(true)
    try {
      await api.patch(`/admin/verification/${profile.userId}/reject`, { reason })
      setMessage('Profile rejected.')
      onStatusChange?.(profile.userId, 'rejected')
      setShowRejectInput(false)
    } catch {
      setMessage('Failed to reject profile.')
    } finally {
      setIsRejecting(false)
    }
  }

  if (profile.status !== 'pending') {
    return (
      <div className={`p-3 rounded-lg text-sm font-medium ${
        profile.status === 'verified' ? 'bg-green-50 text-green-700 border border-green-200' :
        'bg-red-50 text-red-700 border border-red-200'
      }`}>
        Profile is {profile.status}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {profile.idPhotoUrl && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Submitted ID Photo</p>
          <img src={profile.idPhotoUrl} alt="Government ID" className="max-w-full rounded-lg border border-gray-200 max-h-64 object-contain" />
        </div>
      )}

      {showRejectInput ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={3}
            placeholder="Reason for rejection..."
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectInput(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isRejecting || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
            >
              {isRejecting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirm Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            {isApproving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Approve
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-semibold"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
