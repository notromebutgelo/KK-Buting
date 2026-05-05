'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import SignaturePad, { type SignaturePadHandle } from '@/components/ui/SignaturePad'
import AlertModal from '@/components/ui/AlertModal'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { useUser } from '@/hooks/useUser'
import { useUserStore } from '@/store/userStore'
import { getVerificationStatus, saveDigitalIdSignature } from '@/services/verification.service'

export default function ProfileSignaturePage() {
  const router = useRouter()
  const signaturePadRef = useRef<SignaturePadHandle | null>(null)
  const { user, isLoading: isAuthLoading } = useAuthStore()
  const { profile, isLoading: isProfileLoading } = useUser()
  const { setProfile } = useUserStore()

  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [draftSignatureUrl, setDraftSignatureUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login')
    }
  }, [isAuthLoading, router, user])

  useEffect(() => {
    if (!profile) return

    if (!profile.digitalIdSignatureUrl) {
      setIsDrawingMode(true)
    }
  }, [profile])

  const savedSignatureUrl = profile?.digitalIdSignatureUrl || null
  const signedAtLabel = useMemo(
    () => formatDate(profile?.digitalIdSignatureSignedAt || null),
    [profile?.digitalIdSignatureSignedAt]
  )

  const handleClearPad = () => {
    signaturePadRef.current?.clear()
    setDraftSignatureUrl(null)
    setSuccess('')
  }

  const handleStartResign = () => {
    setIsDrawingMode(true)
    setSuccess('')
    setDraftSignatureUrl(null)

    window.requestAnimationFrame(() => {
      signaturePadRef.current?.clear()
    })
  }

  const handleSaveSignature = async () => {
    const signatureUrl = signaturePadRef.current?.getSignatureDataUrl() || draftSignatureUrl

    if (!signatureUrl) {
      setError('Please draw your signature first.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await saveDigitalIdSignature(signatureUrl)
      const nextProfile = await getVerificationStatus()
      setProfile(nextProfile)
      setIsDrawingMode(false)
      setSuccess('Your Digital ID signature has been saved.')
      setDraftSignatureUrl(null)

      window.setTimeout(() => {
        router.push('/scanner/digital-id')
      }, 900)
    } catch (nextError: any) {
      setError(nextError?.response?.data?.error || nextError?.message || 'Failed to save your signature. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isAuthLoading || isProfileLoading) {
    return <Spinner fullPage />
  }

  if (!user) {
    return null
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-gray-50">
        <PageHeader title="Digital ID Signature" />
        <div className="px-5 pt-4">
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <h2 className="text-lg font-bold text-[#014384]">Complete your profiling first</h2>
            <p className="mt-3 text-sm leading-6 text-[#5c7aa3]">
              Your Digital ID signature is connected to your KK profiling record, so we need your profile on file before you can sign.
            </p>
            <Link
              href="/intro"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(5,114,220,0.18)]"
            >
              Continue Profiling
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Digital ID Signature" subtitle="Draw the signature that will appear on your KK Digital ID." />

      <div className="space-y-4 px-5 pb-8 pt-4">
        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#d8e5f4] bg-white p-5 shadow-sm">
          <h2 className="text-[16px] font-bold text-[#014384]">How this works</h2>
          <p className="mt-2 text-sm leading-6 text-[#5c7aa3]">
            Sign inside the pad using your finger or mouse. If you make a mistake, clear the pad and sign again before saving. Saving a new one later will replace the signature currently attached to your Digital ID.
          </p>
        </div>

        {savedSignatureUrl ? (
          <div className="rounded-2xl border border-[#d8e5f4] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#014384]">Current saved signature</h2>
                <p className="mt-1 text-sm text-[#5c7aa3]">
                  {signedAtLabel ? `Saved on ${signedAtLabel}` : 'This signature is currently shown on your Digital ID.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartResign}
                className="rounded-full border border-[#c9daef] bg-[#f7fbff] px-4 py-2 text-xs font-semibold text-[#014384]"
              >
                Re-sign
              </button>
            </div>

            <div className="mt-4 rounded-[24px] border border-dashed border-[#bfd3ea] bg-[#f8fbff] px-4 py-5">
              <div className="flex min-h-[96px] items-center justify-center">
                <img
                  src={savedSignatureUrl}
                  alt="Saved digital ID signature"
                  className="max-h-[96px] w-full object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}

        {isDrawingMode || !savedSignatureUrl ? (
          <div className="rounded-2xl border border-[#d8e5f4] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#014384]">
                  {savedSignatureUrl ? 'Draw a replacement signature' : 'Draw your signature'}
                </h2>
                <p className="mt-1 text-sm text-[#5c7aa3]">
                  Keep your signature inside the box. You can clear the pad and try again as many times as you need before saving.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <SignaturePad
                ref={signaturePadRef}
                onSignatureChange={setDraftSignatureUrl}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleClearPad}
                disabled={isSaving}
              >
                Clear & Try Again
              </Button>
              <Button
                type="button"
                fullWidth
                isLoading={isSaving}
                onClick={handleSaveSignature}
              >
                Save Signature
              </Button>
            </div>

            {savedSignatureUrl ? (
              <button
                type="button"
                onClick={() => {
                  setIsDrawingMode(false)
                  handleClearPad()
                }}
                className="mt-3 w-full text-center text-sm font-medium text-[#5c7aa3]"
              >
                Keep current saved signature instead
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <AlertModal
        isOpen={Boolean(error)}
        title="Signature Save Failed"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
