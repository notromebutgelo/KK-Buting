import api from '../lib/api'
import type { MerchantUser } from '../store/authStore'
import type { MerchantTransaction } from '../types/merchant'
import { maskMemberId } from '../utils/merchant'

type ScanInput = {
  user: MerchantUser | null
  token: string
  amountSpent?: number
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = error.response as { data?: { error?: string } } | undefined
    if (response?.data?.error) {
      return response.data.error
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unable to process this QR code.'
}

function mapTransaction(item: Record<string, unknown>): MerchantTransaction {
  const memberId = String(item.memberId || item.userId || 'unknown-member')

  return {
    id: String(item.id || memberId),
    memberId,
    memberIdMasked: maskMemberId(memberId),
    memberLabel: String(item.userName || 'Verified Member'),
    amountSpent: Number(item.amountSpent || 0),
    pointsAwarded: Number(item.pointsGiven || item.pointsAwarded || 0),
    status: String(item.status || 'success') === 'failed' ? 'failed' : 'success',
    createdAt: String(item.createdAt || new Date().toISOString()),
    note: item.reason ? String(item.reason) : undefined,
  }
}

export async function scanMemberQr({ token, amountSpent }: ScanInput) {
  try {
    const response = await api.post('/qr/redeem', {
      token,
      amountSpent: Number(amountSpent || 0),
    })

    const memberId = String(response.data?.memberId ?? response.data?.userId ?? 'unknown-member')
    const transaction: MerchantTransaction = {
      id: `txn-${Date.now()}`,
      memberId,
      memberIdMasked: maskMemberId(memberId),
      memberLabel: String(response.data?.userName || 'Verified Member'),
      amountSpent: Number(response.data?.amountSpent || amountSpent || 0),
      pointsAwarded: Number(response.data?.pointsAwarded || 0),
      status: 'success',
      createdAt: new Date().toISOString(),
    }

    return {
      userId: String(response.data?.userId ?? 'member'),
      pointsAwarded: transaction.pointsAwarded,
      transaction,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export async function getRecentTransactions(_user: MerchantUser | null) {
  const response = await api.get('/merchants/me/transactions')
  const transactions = (response.data?.transactions || response.data || []) as Array<Record<string, unknown>>
  return transactions.map(mapTransaction)
}
