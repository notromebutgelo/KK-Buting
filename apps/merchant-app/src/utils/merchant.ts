import type { MerchantStatus } from '../types/merchant'

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function maskMemberId(memberId: string) {
  const normalized = String(memberId || 'unknown-member')
  if (normalized.length <= 8) {
    return normalized.toUpperCase()
  }

  return `${normalized.slice(0, 4).toUpperCase()}-${normalized.slice(-4).toUpperCase()}`
}

export function maskMemberLabel(memberId: string) {
  const normalized = String(memberId || 'member')
  return `Member ${normalized.slice(0, 4).toUpperCase()}`
}

export function getStatusLabel(status: MerchantStatus) {
  if (status === 'pending') return 'Pending Approval'
  if (status === 'suspended') return 'Suspended'
  return 'Active'
}

export function getStatusMessage(status: MerchantStatus) {
  if (status === 'pending') {
    return 'Your merchant account is pending SK Admin approval. Scanning stays locked until approval is complete.'
  }

  if (status === 'suspended') {
    return 'Your merchant account is suspended. Contact SK Buting admin to restore scanning and promotions.'
  }

  return 'Your merchant account is active and allowed to issue points.'
}
