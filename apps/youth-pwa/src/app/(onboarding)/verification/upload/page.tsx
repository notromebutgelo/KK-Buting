'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AlertModal from '@/components/ui/AlertModal'
import { getProfiling } from '@/services/profiling.service'
import { uploadVerificationID } from '@/services/verification.service'

type VerificationDocType =
  | 'certificate_of_residency'
  | 'school_id'
  | 'proof_of_voter_registration'
  | 'valid_government_id'
  | 'id_photo'

interface DocumentStep {
  docType: VerificationDocType
  title: string
  helper: string
}

function isChildYouthGroup(ageGroup: string) {
  return ['Early Youth (15-17)', 'Child Youth', 'Child Youth (15-17)'].includes(String(ageGroup || '').trim())
}

export default function VerificationUploadPage() {
  const router = useRouter()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([])
  const [previews, setPreviews] = useState<(string | null)[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [error, setError] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [showSourceActions, setShowSourceActions] = useState(false)
  const isChildYouth = isChildYouthGroup(ageGroup)

  const documentSteps = useMemo<DocumentStep[]>(() => {
    if (isChildYouth) {
      return [
        {
          docType: 'certificate_of_residency',
          title: 'Certificate of Residency',
          helper: 'Upload your residency certificate as your first required document.',
        },
        {
          docType: 'school_id',
          title: 'School ID',
          helper: 'Upload a clear photo of your current school ID.',
        },
        {
          docType: 'id_photo',
          title: 'ID Photo',
          helper: 'Upload a clear selfie-style ID photo for your digital record.',
        },
      ]
    }

    return [
      {
        docType: 'proof_of_voter_registration',
        title: 'Proof of Voter Registration',
        helper: 'Upload your proof of voter registration for verification.',
      },
      {
        docType: 'valid_government_id',
        title: 'Valid Government ID',
        helper: 'Upload a clear copy of your government-issued ID.',
      },
      {
        docType: 'id_photo',
        title: 'ID Photo',
        helper: 'Upload a clear selfie-style ID photo for your digital record.',
      },
    ]
  }, [isChildYouth])

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      setIsProfileLoading(true)
      try {
        const profile = await getProfiling()
        if (!mounted) return
        setAgeGroup(profile?.youthAgeGroup || '')
      } catch {
        if (!mounted) return
        setError('We could not load your profiling record. Please try again.')
      } finally {
        if (mounted) setIsProfileLoading(false)
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setSelectedFiles(Array.from({ length: documentSteps.length }, (_, index) => selectedFiles[index] || null))
    setPreviews(Array.from({ length: documentSteps.length }, (_, index) => previews[index] || null))
    setCurrentStep((current) => Math.min(current, Math.max(documentSteps.length - 1, 0)))
  }, [documentSteps.length])

  useEffect(() => {
    setShowSourceActions(false)
  }, [currentStep])

  const acceptedIDs = [
    'PhilSys / National ID',
    'SSS / GSIS ID',
    "Driver's License",
    'Passport',
    "Voter's ID",
    'School ID + Form 137',
  ]

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      input.value = ''
      setError('File size must be less than 5MB.')
      return
    }

    if (!file.type.startsWith('image/')) {
      input.value = ''
      setError('Please upload an image file (JPG, PNG).')
      return
    }

    setSelectedFiles((current) => {
      const next = [...current]
      next[currentStep] = file
      return next
    })
    setError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviews((current) => {
        const next = [...current]
        next[currentStep] = event.target?.result as string
        return next
      })
    }
    reader.readAsDataURL(file)

    input.value = ''
  }

  const handleSubmit = async () => {
    const currentFile = selectedFiles[currentStep]

    if (!currentFile) {
      setError('Please select a photo before continuing.')
      return
    }

    if (currentStep < documentSteps.length - 1) {
      setCurrentStep((step) => step + 1)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      for (let index = 0; index < documentSteps.length; index += 1) {
        await uploadVerificationID(selectedFiles[index] as File, documentSteps[index].docType)
      }
      router.push('/verification/submitted')
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const currentPreview = previews[currentStep]
  const currentFile = selectedFiles[currentStep]
  const currentDocument = documentSteps[currentStep]
  const isIdPhotoStep = currentDocument?.docType === 'id_photo'

  if (isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
        <div className="rounded-[24px] bg-white px-6 py-5 text-center text-[#014384] shadow-[0_24px_60px_rgba(1,67,132,0.18)]">
          Loading verification requirements...
        </div>
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4">
        <div className="max-w-sm rounded-[24px] bg-white px-6 py-5 text-center shadow-[0_24px_60px_rgba(1,67,132,0.18)]">
          <p className="text-sm font-medium text-[#c24b4b]">
            We could not determine your required verification documents yet.
          </p>
          <Link href="/intro" className="mt-4 inline-block text-sm font-semibold text-[#014384]">
            Back to profiling
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f5f5] text-[#014384]">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#7fb3ec_0%,#bdd7f3_20%,#eef5fd_46%,#fff8eb_74%,#f5f5f5_100%)]" />
        <div className="absolute inset-0 bg-white/18 backdrop-blur-[10px]" />

        <div className="relative z-10 px-4 pb-24 pt-10">
          <div className="mx-auto w-full max-w-[360px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full bg-white/86 px-4 py-2 text-[13px] font-semibold text-[#014384] shadow-[0_10px_24px_rgba(1,67,132,0.12)] backdrop-blur-[4px]"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>

              <Link
                href="/home"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(5,114,220,0.2)]"
              >
                Return to Home
              </Link>
            </div>

            <div className="rounded-[28px] bg-white px-5 pb-5 pt-6 shadow-[0_24px_60px_rgba(1,67,132,0.18)]">
              <div className="mb-5 text-center">
                <p className="mx-auto max-w-[250px] text-[13px] leading-[1.5] text-[#4f6f9b]">
                  {currentDocument.helper}
                </p>
                <h2 className="mt-4 text-[20px] font-extrabold text-[#014384]">
                  {currentDocument.title}
                </h2>
                <p className="mt-2 text-[12px] font-medium text-[#7b97bc]">
                  Required for {ageGroup || 'your age group'}
                </p>
                {isIdPhotoStep ? (
                  <div className="mt-4 rounded-[18px] bg-[#fff8eb] px-4 py-3 text-left text-[12px] leading-[1.55] text-[#7c5a0a]">
                    This photo will be used on your Digital KK ID after your account is verified, so use a clear front-facing picture with good lighting.
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSourceActions(true)
                  setError('')
                }}
                className={`flex w-full flex-col items-center rounded-[24px] border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  currentPreview
                    ? 'border-[#2b69ac] bg-[#edf4fb]'
                    : 'border-[#2b69ac] bg-[#edf4fb]'
                } ${showSourceActions ? 'ring-2 ring-[#2b69ac]/15' : ''}`}
                aria-label={currentPreview ? 'Change uploaded document' : 'Choose how to upload your document'}
              >
                {currentPreview ? (
                  <div className="relative h-[170px] w-full overflow-hidden rounded-[18px] bg-white">
                    <Image
                      src={currentPreview}
                      alt="Selected document preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <Image
                      src="/images/UploadDocuments.png"
                      alt="Upload required documents"
                      width={88}
                      height={88}
                      className="h-auto w-[88px] object-contain"
                    />
                    <span className="mt-3 text-[18px] font-medium text-[#1e4f91]">
                      {isIdPhotoStep ? 'ID Photo Ready' : 'Document Ready'}
                    </span>
                    <span className="mt-2 text-[12px] font-medium text-[#5f7b9d]">
                      Tap here to choose upload source
                    </span>
                  </>
                )}
              </button>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (uploadInputRef.current) {
                      uploadInputRef.current.value = ''
                      uploadInputRef.current.click()
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-[18px] border border-[#cfe0f2] bg-white px-4 py-3 text-[14px] font-semibold text-[#014384] shadow-sm transition hover:bg-[#f7fbff]"
                >
                  Upload from Device
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (cameraInputRef.current) {
                      cameraInputRef.current.value = ''
                      cameraInputRef.current.click()
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(5,114,220,0.18)]"
                >
                  {isIdPhotoStep ? 'Take a Photo' : 'Use Camera'}
                </button>
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                capture={isIdPhotoStep ? 'user' : 'environment'}
              />

              <div className="mt-4 flex items-center justify-between">
                {currentStep === 0 ? (
                  <Link
                    href="/home"
                    className="text-[16px] font-semibold italic text-[#1e4f91]"
                  >
                    Return to Home
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep((step) => Math.max(step - 1, 0))
                      setError('')
                    }}
                    className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] text-white shadow-[0_10px_22px_rgba(5,114,220,0.22)]"
                    aria-label="Go back to previous document"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {documentSteps.map((_, index) => (
                    <span
                      key={index}
                      className={`h-[7px] w-[7px] rounded-full ${
                        index === currentStep ? 'bg-[#014384]' : 'bg-[#c7d8eb]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!currentFile || isLoading}
                  className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[linear-gradient(90deg,#014384_0%,#035DB7_52%,#0572DC_100%)] text-white shadow-[0_10px_22px_rgba(5,114,220,0.22)] disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={currentStep === documentSteps.length - 1 ? 'Submit uploaded documents' : 'Continue to next document'}
                >
                  {isLoading ? (
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-white/88 px-5 py-5 shadow-[0_16px_40px_rgba(1,67,132,0.1)] backdrop-blur-[4px]">
              <h2 className="text-[16px] font-extrabold text-[#014384]">
                Required Documents
              </h2>
              <ul className="mt-3 space-y-2.5">
                {documentSteps.map((step) => (
                  <li
                    key={step.docType}
                    className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-[#1e4f91]"
                  >
                    <span className="mt-[3px] inline-flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-full bg-[#edf4fb] text-[#014384]">
                      <svg
                        width="10"
                        height="10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{step.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,240,205,0.98)_0%,rgba(255,248,231,0.98)_100%)] px-5 py-5 shadow-[0_16px_40px_rgba(252,179,21,0.12)]">
              <h2 className="text-[16px] font-extrabold text-[#014384]">
                Tips for Better Verification
              </h2>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-[1.45] text-[#7c5a0a]">
                <li>Make sure all text on your document is clearly readable.</li>
                <li>Use good lighting and avoid blurry photos.</li>
                <li>Avoid glare, shadows, or cropped edges on the document.</li>
                <li>Your final step should always be a clean ID photo.</li>
                <li>The ID photo you submit will appear on your Digital KK ID once approved.</li>
              </ul>
            </div>

            {!isChildYouth ? (
              <div className="mt-4 rounded-[24px] bg-white/88 px-5 py-5 shadow-[0_16px_40px_rgba(1,67,132,0.1)] backdrop-blur-[4px]">
                <h2 className="text-[16px] font-extrabold text-[#014384]">
                  Accepted IDs
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {acceptedIDs.map((id) => (
                    <li
                      key={id}
                      className="flex items-start gap-2.5 text-[13px] leading-[1.45] text-[#1e4f91]"
                    >
                      <span className="mt-[3px] inline-flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-full bg-[#edf4fb] text-[#014384]">
                        <svg
                          width="10"
                          height="10"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span>{id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AlertModal
        isOpen={Boolean(error)}
        title="Verification Upload Issue"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}
