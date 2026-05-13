'use client'

import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import PhysicalIdRequestStatusBadge, {
  getPhysicalIdRequestStatusLabel,
} from '@/components/features/PhysicalIdRequestStatusBadge'
import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { usePhysicalIdRequests } from '@/hooks/usePhysicalIdRequests'
import type { PhysicalIdRequest } from '@/services/physicalIdRequests.service'

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'processing', label: 'Processing' },
  { key: 'ready_for_pickup', label: 'Ready for Pick-up' },
  { key: 'completed', label: 'Completed' },
] as const

export default function PhysicalIdRequestsPage() {
  const {
    requests,
    activeRequest,
    eligibilityReason,
    isLoading,
    error,
    clearError,
  } = usePhysicalIdRequests()

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title="My Physical ID Requests"
        subtitle="Track your physical copy request and pick-up updates."
      />

      <div className="space-y-4 px-5 pb-8 pt-4">
        <section className="rounded-[26px] bg-[linear-gradient(135deg,#014384_0%,#035db7_55%,#0b79e3_100%)] p-5 text-white shadow-[0_18px_38px_rgba(1,67,132,0.16)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Physical ID Copy
          </p>
          <h1 className="mt-2 text-[20px] font-black leading-[1.08]">
            Pick-up only processing
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-white/82">
            We will update you here once your request moves from review to pick-up readiness.
          </p>

          {activeRequest ? (
            <div className="mt-4 rounded-[20px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/68">
                    Active request
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-white">
                    {getPhysicalIdRequestStatusLabel(activeRequest.status)}
                  </p>
                </div>
                <PhysicalIdRequestStatusBadge
                  status={activeRequest.status}
                  className="border-white/12 bg-white/14 text-white [&>span:first-child]:bg-[#fcb315]"
                />
              </div>
              <p className="mt-3 text-[12px] leading-6 text-white/78">
                Requested on {formatDateTime(activeRequest.createdAt)}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[20px] border border-white/14 bg-white/10 px-4 py-4 backdrop-blur-sm">
              <p className="text-[13px] leading-6 text-white/82">
                {eligibilityReason || 'No active physical ID request yet. You can create one from your Digital ID page once your card is active.'}
              </p>
            </div>
          )}
        </section>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-[24px] bg-white px-5 py-12 text-center shadow-[0_12px_28px_rgba(1,67,132,0.08)]">
            <p className="text-[16px] font-bold text-[#014384]">No physical ID requests yet</p>
            <p className="mt-2 text-[13px] leading-6 text-[#5c7aa3]">
              Once you submit one from the Digital ID page, the request timeline will appear here.
            </p>
            <Link
              href="/scanner/digital-id"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035db7_58%,#0a74de_100%)] px-5 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(1,67,132,0.14)]"
            >
              Open Digital ID
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <RequestHistoryCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>

      <AlertModal
        isOpen={Boolean(error)}
        title="Physical ID Requests Unavailable"
        message={error || ''}
        tone="error"
        onClose={clearError}
      />
    </div>
  )
}

function RequestHistoryCard({ request }: { request: PhysicalIdRequest }) {
  const timeline = getTimelineSteps(request)

  return (
    <section className="rounded-[24px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(1,67,132,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
            Request date
          </p>
          <h2 className="mt-1 text-[16px] font-extrabold text-[#014384]">
            {formatDateTime(request.createdAt)}
          </h2>
        </div>
        <PhysicalIdRequestStatusBadge status={request.status} />
      </div>

      <div className="mt-4 rounded-[20px] border border-[#e1ebf5] bg-[#f8fbff] px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
          Reason for request
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[#014384]">{request.reason}</p>
        {request.notes ? (
          <>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7e95b2]">
              Notes
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[#5c7aa3]">{request.notes}</p>
          </>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {timeline.map((step) => (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-0.5 h-3.5 w-3.5 rounded-full ${
                  step.state === 'done'
                    ? 'bg-[#0572DC]'
                    : step.state === 'current'
                      ? 'bg-[#fcb315]'
                      : 'bg-[#d8e4f2]'
                }`}
              />
              {step.showLine ? (
                <span className="mt-1 h-full w-[2px] bg-[#dbe7f3]" />
              ) : null}
            </div>

            <div className="pb-3">
              <p className="text-[13px] font-bold text-[#014384]">{step.label}</p>
              <p className="mt-1 text-[12px] leading-6 text-[#5c7aa3]">
                {step.timestamp ? formatDateTime(step.timestamp) : step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {request.readyForPickupNotice ? (
        <div className="mt-4 rounded-[20px] border border-[#ccecd8] bg-[#eefaf2] px-4 py-3 text-[13px] leading-6 text-[#23724a]">
          {request.readyForPickupNotice}
        </div>
      ) : null}

      {request.rejectionReason ? (
        <div className="mt-4 rounded-[20px] border border-[#f5d0d0] bg-[#fff1f1] px-4 py-3 text-[13px] leading-6 text-[#bf4747]">
          <span className="font-bold">Rejection reason:</span> {request.rejectionReason}
        </div>
      ) : null}

      {request.adminRemarks ? (
        <div className="mt-4 rounded-[20px] border border-[#dbe7f6] bg-[#f6fbff] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6f89aa]">
            Admin remarks
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[#315b8d]">{request.adminRemarks}</p>
        </div>
      ) : null}
    </section>
  )
}

function getTimelineSteps(request: PhysicalIdRequest) {
  const doneStatuses = {
    pending: ['pending'],
    approved: ['pending', 'approved'],
    processing: ['pending', 'approved', 'processing'],
    ready_for_pickup: ['pending', 'approved', 'processing', 'ready_for_pickup'],
    completed: ['pending', 'approved', 'processing', 'ready_for_pickup', 'completed'],
    rejected: ['pending', 'rejected'],
  } as const

  if (request.status === 'rejected') {
    return [
      {
        label: 'Pending',
        state: 'done' as const,
        timestamp: request.createdAt,
        description: 'Your request was submitted for review.',
        showLine: true,
      },
      {
        label: 'Rejected',
        state: 'current' as const,
        timestamp: request.rejectedAt,
        description: 'The request did not move forward for processing.',
        showLine: false,
      },
    ]
  }

  return TIMELINE_STEPS.map((step, index) => {
    const currentDoneStatuses = doneStatuses[request.status]
    const timestamp =
      step.key === 'pending'
        ? request.createdAt
        : step.key === 'approved'
          ? request.approvedAt
          : step.key === 'processing'
            ? request.processingAt
            : step.key === 'ready_for_pickup'
              ? request.readyForPickupAt
              : request.completedAt

    const stepState = request.status === step.key
      ? 'current'
      : (currentDoneStatuses as readonly string[]).includes(step.key)
        ? 'done'
        : 'upcoming'

    return {
      label: step.label,
      state: stepState,
      timestamp,
      description: getTimelineDescription(step.key),
      showLine: index < TIMELINE_STEPS.length - 1,
    }
  })
}

function getTimelineDescription(status: typeof TIMELINE_STEPS[number]['key']) {
  if (status === 'pending') {
    return 'Your request was submitted and is waiting for review.'
  }

  if (status === 'approved') {
    return 'The request passed initial review and can move into processing.'
  }

  if (status === 'processing') {
    return 'The physical copy is currently being prepared.'
  }

  if (status === 'ready_for_pickup') {
    return 'The SK office can now schedule or release your pick-up.'
  }

  return 'The request was claimed and marked as completed.'
}

function formatDateTime(value: string | null) {
  if (!value) return 'Waiting for update'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Waiting for update'

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
