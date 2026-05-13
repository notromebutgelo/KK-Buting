import api from '@/lib/api'

export type PhysicalIdRequestStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'ready_for_pickup'
  | 'completed'
  | 'rejected'

export interface PhysicalIdRequest {
  id: string
  userId: string
  digitalIdReference: string
  fullName: string
  barangay: string
  reason: string
  contactNumber: string
  notes: string
  status: PhysicalIdRequestStatus
  statusLabel: string
  adminRemarks: string | null
  rejectionReason: string | null
  handledBy: string | null
  createdAt: string | null
  updatedAt: string | null
  approvedAt: string | null
  processingAt: string | null
  readyForPickupAt: string | null
  completedAt: string | null
  rejectedAt: string | null
  readyForPickupNotice: string | null
}

export interface MyPhysicalIdRequestsResponse {
  requests: PhysicalIdRequest[]
  activeRequest: PhysicalIdRequest | null
  canRequest: boolean
  eligibilityReason: string | null
}

type CreatePhysicalIdRequestPayload = {
  reason: string
  contactNumber: string
  notes?: string
}

function mapPhysicalIdRequest(item: Record<string, unknown>): PhysicalIdRequest {
  return {
    id: String(item.id || ''),
    userId: String(item.userId || ''),
    digitalIdReference: String(item.digitalIdReference || ''),
    fullName: String(item.fullName || ''),
    barangay: String(item.barangay || ''),
    reason: String(item.reason || ''),
    contactNumber: String(item.contactNumber || ''),
    notes: String(item.notes || ''),
    status: (String(item.status || 'pending') as PhysicalIdRequestStatus),
    statusLabel: String(item.statusLabel || item.status || 'Pending'),
    adminRemarks: item.adminRemarks ? String(item.adminRemarks) : null,
    rejectionReason: item.rejectionReason ? String(item.rejectionReason) : null,
    handledBy: item.handledBy ? String(item.handledBy) : null,
    createdAt: item.createdAt ? String(item.createdAt) : null,
    updatedAt: item.updatedAt ? String(item.updatedAt) : null,
    approvedAt: item.approvedAt ? String(item.approvedAt) : null,
    processingAt: item.processingAt ? String(item.processingAt) : null,
    readyForPickupAt: item.readyForPickupAt ? String(item.readyForPickupAt) : null,
    completedAt: item.completedAt ? String(item.completedAt) : null,
    rejectedAt: item.rejectedAt ? String(item.rejectedAt) : null,
    readyForPickupNotice: item.readyForPickupNotice ? String(item.readyForPickupNotice) : null,
  }
}

export async function getMyPhysicalIdRequests(): Promise<MyPhysicalIdRequestsResponse> {
  try {
    const res = await api.get('/physical-id-requests/me')
    const requests = Array.isArray(res.data?.requests)
      ? res.data.requests.map((item: Record<string, unknown>) => mapPhysicalIdRequest(item))
      : []

    return {
      requests,
      activeRequest: res.data?.activeRequest
        ? mapPhysicalIdRequest(res.data.activeRequest as Record<string, unknown>)
        : null,
      canRequest: Boolean(res.data?.canRequest),
      eligibilityReason: res.data?.eligibilityReason
        ? String(res.data.eligibilityReason)
        : null,
    }
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.error
      || 'Failed to load physical ID requests.'
    )
  }
}

export async function createPhysicalIdRequest(
  payload: CreatePhysicalIdRequestPayload
) {
  try {
    const res = await api.post('/physical-id-requests', payload)
    return res.data?.request
      ? mapPhysicalIdRequest(res.data.request as Record<string, unknown>)
      : null
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.error
      || 'Failed to submit physical ID request.'
    )
  }
}
