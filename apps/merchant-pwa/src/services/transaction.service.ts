import axios from 'axios'
import api from '@/lib/api'
import type { MerchantTransaction } from '@/types/merchant'
import { maskMemberId } from '@/utils/format'

export async function redeemQr(token: string, amountSpent: number) {
  const normalizedAmount = Number(amountSpent)
  if (!token.trim()) {
    throw new Error('Scan or enter a member QR token.')
  }
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Enter the purchase amount before redeeming.')
  }

  try {
    const response = await api.post('/qr/redeem', {
      token: token.trim(),
      amountSpent: normalizedAmount,
    })
    const memberId = String(response.data?.memberId ?? response.data?.userId ?? 'member')
    const transaction: MerchantTransaction = {
      id: `txn-${Date.now()}`,
      memberId,
      memberIdMasked: maskMemberId(memberId),
      memberLabel: String(response.data?.userName || 'Verified Member'),
      amountSpent: Number(response.data?.amountSpent || normalizedAmount),
      pointsAwarded: Number(response.data?.pointsAwarded || response.data?.pointsGiven || 0),
      status: 'success',
      createdAt: new Date().toISOString(),
    }

    return transaction
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const details = error.response?.data?.details
      const diagnostic = details?.qrReason ? ` (${details.qrReason})` : ''
      throw new Error(`${String(error.response?.data?.error || error.message || 'Unable to process this QR code.')}${diagnostic}`)
    }
    throw error
  }
}
