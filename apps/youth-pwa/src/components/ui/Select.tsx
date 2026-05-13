'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder: string
  required?: boolean
  error?: string
  hint?: string
  id?: string
}

export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  hint,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()
  const triggerId = id || label?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || listboxId
  const selectedLabel = useMemo(
    () => options.find((option) => option === value) || '',
    [options, value]
  )
  const hasSelectedOption = Boolean(selectedLabel)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) {
        return
      }

      const target = event.target
      if (target instanceof Node && !wrapperRef.current.contains(target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={triggerId} className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      ) : null}

      <div className="relative" ref={wrapperRef}>
        <button
          id={triggerId}
          type="button"
          className={cn(
            'flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent',
            error
              ? 'border-red-400 bg-red-50'
              : 'border-gray-300 bg-white hover:border-gray-400',
            !hasSelectedOption && 'text-gray-400',
            hasSelectedOption && 'text-gray-900'
          )}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-required={required}
        >
          <span className="min-w-0 flex-1">{selectedLabel || placeholder}</span>
          <ChevronDownIcon className={cn('shrink-0 text-gray-500 transition-transform duration-200', isOpen && 'rotate-180')} />
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30">
            <div
              id={listboxId}
              className="max-h-60 overflow-y-auto rounded-2xl border border-white/80 bg-[rgba(255,249,236,0.98)] p-2 shadow-[0_18px_34px_rgba(15,40,86,0.18)] backdrop-blur-[14px]"
              role="listbox"
              aria-label={label || placeholder}
            >
              {!required ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ''}
                  className={cn(
                    'w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors',
                    value === ''
                      ? 'bg-[#e1efff] text-[#014384]'
                      : 'text-[#1b3a6b] hover:bg-white/70'
                  )}
                  onClick={() => {
                    onChange('')
                    setIsOpen(false)
                  }}
                >
                  {placeholder}
                </button>
              ) : null}

              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  className={cn(
                    'w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors',
                    value === option
                      ? 'bg-[#e1efff] text-[#014384]'
                      : 'text-[#1b3a6b] hover:bg-white/70'
                  )}
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
      {hint && !error ? <p className="mt-1.5 text-sm text-gray-500">{hint}</p> : null}
    </div>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
