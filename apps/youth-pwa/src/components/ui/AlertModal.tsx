'use client'

import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface AlertModalProps {
  isOpen: boolean
  title?: string
  message: string
  onClose: () => void
  actionLabel?: string
  tone?: 'warning' | 'success' | 'error' | 'info'
}

export default function AlertModal({
  isOpen,
  title = 'Something went wrong',
  message,
  onClose,
  actionLabel = 'OK',
  tone = 'warning',
}: AlertModalProps) {
  const styles = getAlertToneStyles(tone)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${styles.iconWrapClass} ${styles.iconClass}`}>
          <svg
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            {renderAlertIcon(tone)}
          </svg>
        </div>

        <p className="text-center text-sm leading-6 text-[#5c7aa3]">{message}</p>

        <Button type="button" fullWidth onClick={onClose}>
          {actionLabel}
        </Button>
      </div>
    </Modal>
  )
}

function getAlertToneStyles(tone: NonNullable<AlertModalProps['tone']>) {
  if (tone === 'success') {
    return {
      iconWrapClass: 'bg-[linear-gradient(135deg,#e8f4ff_0%,#f4fbff_100%)]',
      iconClass: 'text-[#0572DC]',
    }
  }

  if (tone === 'error') {
    return {
      iconWrapClass: 'bg-[#fff1f1]',
      iconClass: 'text-[#d64545]',
    }
  }

  if (tone === 'info') {
    return {
      iconWrapClass: 'bg-[#edf6ff]',
      iconClass: 'text-[#014384]',
    }
  }

  return {
    iconWrapClass: 'bg-[#fff5e8]',
    iconClass: 'text-[#f0a100]',
  }
}

function renderAlertIcon(tone: NonNullable<AlertModalProps['tone']>) {
  if (tone === 'success') {
    return (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 13 4 4L19 7"
      />
    )
  }

  if (tone === 'info') {
    return (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 12h1v4h1" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        />
      </>
    )
  }

  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
    />
  )
}
