import { cn } from '@/utils/cn'

interface BadgeProps {
  status: 'pending' | 'verified' | 'rejected' | string
  className?: string
  size?: 'sm' | 'md'
}

export default function Badge({ status, className, size = 'md' }: BadgeProps) {
  const statusConfig = {
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    verified: { label: 'Verified', classes: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-800 border-red-200' },
    approved: { label: 'Approved', classes: 'bg-blue-100 text-blue-800 border-blue-200' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    classes: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.classes,
        sizes[size],
        className
      )}
    >
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'verified' ? 'bg-green-500' :
        status === 'pending' ? 'bg-yellow-500' :
        status === 'rejected' ? 'bg-red-500' :
        'bg-blue-500'
      )} />
      {config.label}
    </span>
  )
}
