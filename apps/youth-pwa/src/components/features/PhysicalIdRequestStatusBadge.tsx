import { cn } from '@/utils/cn'
import type { PhysicalIdRequestStatus } from '@/services/physicalIdRequests.service'

interface PhysicalIdRequestStatusBadgeProps {
  status: PhysicalIdRequestStatus | string
  size?: 'sm' | 'md'
  className?: string
}

const STATUS_STYLES: Record<
  PhysicalIdRequestStatus,
  { label: string; wrapper: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    wrapper: 'border-[#ffe1a6] bg-[#fff8eb] text-[#9b6b00]',
    dot: 'bg-[#fcb315]',
  },
  approved: {
    label: 'Approved',
    wrapper: 'border-[#d7e7fb] bg-[#edf5ff] text-[#0d5eb6]',
    dot: 'bg-[#0572DC]',
  },
  processing: {
    label: 'Processing',
    wrapper: 'border-[#d7e7fb] bg-[#f3f8ff] text-[#1b63af]',
    dot: 'bg-[#3d86de]',
  },
  ready_for_pickup: {
    label: 'Ready for Pick-up',
    wrapper: 'border-[#ccecd8] bg-[#eefaf2] text-[#23724a]',
    dot: 'bg-[#2faa63]',
  },
  completed: {
    label: 'Completed',
    wrapper: 'border-[#d6e4f3] bg-[#f3f7fc] text-[#40668f]',
    dot: 'bg-[#6b8eb4]',
  },
  rejected: {
    label: 'Rejected',
    wrapper: 'border-[#f5d0d0] bg-[#fff1f1] text-[#bf4747]',
    dot: 'bg-[#d64545]',
  },
}

export function getPhysicalIdRequestStatusLabel(status: string) {
  return STATUS_STYLES[status as PhysicalIdRequestStatus]?.label
    || status.split('_').join(' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function PhysicalIdRequestStatusBadge({
  status,
  size = 'md',
  className,
}: PhysicalIdRequestStatusBadgeProps) {
  const style = STATUS_STYLES[status as PhysicalIdRequestStatus] || STATUS_STYLES.pending

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
        style.wrapper,
        className
      )}
    >
      <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', style.dot)} />
      {style.label}
    </span>
  )
}
