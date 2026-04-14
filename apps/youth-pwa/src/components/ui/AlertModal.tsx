'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface AlertModalProps {
  isOpen: boolean
  title?: string
  message: string
  onClose: () => void
  actionLabel?: string
}

export default function AlertModal({
  isOpen,
  title = 'Something went wrong',
  message,
  onClose,
  actionLabel = 'OK',
}: AlertModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff5e8] text-[#f0a100]">
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            />
          </svg>
        </div>

        <p className="text-center text-sm leading-6 text-gray-600">{message}</p>

        <Button type="button" fullWidth onClick={onClose}>
          {actionLabel}
        </Button>
      </div>
    </Modal>
  )
}
