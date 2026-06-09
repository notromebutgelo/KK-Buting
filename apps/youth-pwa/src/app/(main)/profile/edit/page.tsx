'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useUser } from '@/hooks/useUser'
import { useUserStore } from '@/store/userStore'
import api from '@/lib/api'
import { updateProfiling } from '@/services/profiling.service'
import PageHeader from '@/components/layout/PageHeader'
import AlertModal from '@/components/ui/AlertModal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'

const MEMBER_CONTACT_NUMBER_MAX_LENGTH = 11
const EMERGENCY_CONTACT_PHONE_MAX_LENGTH = 11
const PUROK_OPTIONS = [
  'ILAYA',
  'ALIW',
  'GITNA',
  'LOOBAN',
  'MANGGAHAN',
  'BUKID',
] as const

type SaveFeedbackState = {
  title: string
  message: string
  actionLabel: string
  tone: 'success' | 'error'
  goBackOnClose?: boolean
}

export default function EditProfilePage() {
  const router = useRouter()
  const { user, setUser, isLoading: isAuthLoading } = useAuthStore()
  const { profile, isLoading: isProfileLoading } = useUser()
  const { setProfile } = useUserStore()

  const [username, setUsername] = useState(user?.UserName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [contactNumber, setContactNumber] = useState('')
  const [purok, setPurok] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [yearsInBarangay, setYearsInBarangay] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isYearsSubmitting, setIsYearsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<SaveFeedbackState | null>(null)
  const [showContactNumberValidation, setShowContactNumberValidation] = useState(false)
  const [showYearsValidation, setShowYearsValidation] = useState(false)
  const [isYearsConfirmOpen, setIsYearsConfirmOpen] = useState(false)

  const contactNumberError = showContactNumberValidation
    ? getMemberContactNumberError(contactNumber)
    : ''
  const yearsInBarangayError = showYearsValidation
    ? getYearsInBarangayError(yearsInBarangay)
    : ''
  const canSubmitMissingYears =
    Boolean(profile) && !hasStoredYearsInBarangay(profile?.yearsInBarangay)
  const normalizedYearsInBarangay = normalizeYearsInBarangay(yearsInBarangay)

  useEffect(() => {
    if (user) {
      setUsername(user.UserName || '')
      setEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setContactNumber(normalizeMemberContactNumber(profile.contactNumber || ''))
      setPurok(normalizePurok(profile.purok || ''))
      setEmergencyContactName(profile.digitalIdEmergencyContactName || '')
      setEmergencyContactRelationship(profile.digitalIdEmergencyContactRelationship || '')
      setEmergencyContactPhone(
        normalizeEmergencyContactPhone(
          profile.digitalIdEmergencyContactPhone || '',
          EMERGENCY_CONTACT_PHONE_MAX_LENGTH
        )
      )
      setYearsInBarangay(
        hasStoredYearsInBarangay(profile.yearsInBarangay)
          ? String(profile.yearsInBarangay)
          : ''
      )
    }
  }, [profile])

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login')
    }
  }, [isAuthLoading, router, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setIsLoading(true)
    setShowContactNumberValidation(true)

    const trimmedUsername = username.trim()
    const trimmedContactNumber = normalizeMemberContactNumber(contactNumber)
    const trimmedPurok = normalizePurok(purok)
    const trimmedContactName = emergencyContactName.trim()
    const trimmedContactRelationship = emergencyContactRelationship.trim()
    const trimmedContactPhone = normalizeEmergencyContactPhone(
      emergencyContactPhone,
      EMERGENCY_CONTACT_PHONE_MAX_LENGTH
    )
    const hasAnyEmergencyContactField = Boolean(
      trimmedContactName || trimmedContactRelationship || trimmedContactPhone
    )
    const hasCompleteEmergencyContact = Boolean(
      trimmedContactName && trimmedContactRelationship && trimmedContactPhone
    )

    if (getMemberContactNumberError(trimmedContactNumber)) {
      setFeedback({
        title: 'Unable to Save Changes',
        message: 'Contact number must be 11 digits and start with 09.',
        actionLabel: 'Review Details',
        tone: 'error',
      })
      setIsLoading(false)
      return
    }

    if (hasAnyEmergencyContactField && !hasCompleteEmergencyContact) {
      setFeedback({
        title: 'Unable to Save Changes',
        message: 'Please complete all emergency contact fields or leave them all blank.',
        actionLabel: 'Review Details',
        tone: 'error',
      })
      setIsLoading(false)
      return
    }

    try {
      const requests: Promise<unknown>[] = []

      if (trimmedUsername && trimmedUsername !== (user?.UserName || '')) {
        requests.push(api.patch('/users/me', { UserName: trimmedUsername }))
      }

      if (profile) {
        requests.push(
          updateProfiling({
            contactNumber: trimmedContactNumber,
            purok: trimmedPurok,
            digitalIdEmergencyContactName: trimmedContactName,
            digitalIdEmergencyContactRelationship: trimmedContactRelationship,
            digitalIdEmergencyContactPhone: trimmedContactPhone,
          })
        )
      }

      if (requests.length > 0) {
        await Promise.all(requests)
      }

      if (user && trimmedUsername) {
        setUser({ ...user, UserName: trimmedUsername })
      }

      if (profile) {
        setProfile({
          ...profile,
          contactNumber: trimmedContactNumber,
          purok: trimmedPurok,
          digitalIdEmergencyContactName: trimmedContactName,
          digitalIdEmergencyContactRelationship: trimmedContactRelationship,
          digitalIdEmergencyContactPhone: trimmedContactPhone,
          digitalIdEmergencyContactComplete: hasCompleteEmergencyContact,
        })
      }

      setFeedback({
        title: 'Profile Updated',
        message: 'Your profile changes have been saved successfully.',
        actionLabel: 'Back to Profile',
        tone: 'success',
        goBackOnClose: true,
      })
    } catch {
      setFeedback({
        title: 'Profile Update Failed',
        message: 'Failed to update your profile details. Please try again.',
        actionLabel: 'Try Again',
        tone: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleYearsSubmitRequest = () => {
    setFeedback(null)
    setShowYearsValidation(true)

    if (!canSubmitMissingYears) {
      setFeedback({
        title: 'Already Submitted',
        message:
          'Years in Barangay has already been saved for this profile. Contact SK admin if this value needs correction.',
        actionLabel: 'OK',
        tone: 'error',
      })
      return
    }

    if (getYearsInBarangayError(yearsInBarangay)) {
      return
    }

    setIsYearsConfirmOpen(true)
  }

  const handleConfirmYearsSubmit = async () => {
    if (!profile || getYearsInBarangayError(yearsInBarangay)) return

    setIsYearsSubmitting(true)
    try {
      await updateProfiling({ yearsInBarangay: Number(normalizedYearsInBarangay) })
      setProfile({
        ...profile,
        yearsInBarangay: Number(normalizedYearsInBarangay),
      })
      setIsYearsConfirmOpen(false)
      setFeedback({
        title: 'Years in Barangay Saved',
        message:
          'Your Years in Barangay has been saved and will now appear in the admin and superadmin records.',
        actionLabel: 'OK',
        tone: 'success',
      })
    } catch (error: any) {
      setIsYearsConfirmOpen(false)
      setFeedback({
        title: 'Unable to Save Years',
        message:
          error?.response?.data?.error ||
          'Years in Barangay could not be saved. Please try again or contact SK admin.',
        actionLabel: 'OK',
        tone: 'error',
      })
    } finally {
      setIsYearsSubmitting(false)
    }
  }

  const handleFeedbackClose = () => {
    const shouldGoBack = Boolean(feedback?.goBackOnClose)
    setFeedback(null)

    if (shouldGoBack) {
      router.back()
    }
  }

  if (isAuthLoading || isProfileLoading) {
    return <Spinner fullPage />
  }

  if (!user) return null

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Edit Profile" />
      <div className="px-5 pt-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={email}
              disabled
              hint="Email cannot be changed."
            />
            <div className="rounded-2xl border border-[#d8e5f4] bg-[#f7fbff] p-4">
              <div className="mb-3">
                <h2 className="text-[15px] font-bold text-[#014384]">Digital ID Front Details</h2>
                <p className="mt-1 text-sm leading-6 text-[#5c7aa3]">
                  These details appear on the front of your Digital ID and stay synced with the superadmin preview.
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="Contact Number"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => {
                    setContactNumber(normalizeMemberContactNumber(e.target.value))
                  }}
                  onBlur={() => setShowContactNumberValidation(true)}
                  placeholder="Example: 09171234567"
                  inputMode="numeric"
                  maxLength={MEMBER_CONTACT_NUMBER_MAX_LENGTH}
                  error={contactNumberError}
                  hint="Optional, but if you add one it must be 11 digits and start with 09."
                />
                <Select
                  label="Purok / Zone"
                  value={purok}
                  onChange={setPurok}
                  options={PUROK_OPTIONS}
                  placeholder="Select your purok / zone"
                  hint="Optional. This fills the Purok field below your home address."
                />
              </div>
            </div>
            {canSubmitMissingYears ? (
              <div className="rounded-2xl border border-[#f4d58b] bg-[#fff8e8] p-4">
                <div className="mb-3">
                  <h2 className="text-[15px] font-bold text-[#9c6500]">Complete Years in Barangay</h2>
                  <p className="mt-1 text-sm leading-6 text-[#7b641d]">
                    Your account was created before this field was added. Submit it once so admin and superadmin records stay complete.
                  </p>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Years in Barangay"
                    type="number"
                    value={yearsInBarangay}
                    onChange={(e) => setYearsInBarangay(normalizeYearsInBarangay(e.target.value))}
                    onBlur={() => setShowYearsValidation(true)}
                    placeholder="Example: 5"
                    inputMode="numeric"
                    error={yearsInBarangayError}
                    hint="Use 0 if you have lived in the barangay for less than one year. This can only be submitted once."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    isLoading={isYearsSubmitting}
                    onClick={handleYearsSubmitRequest}
                  >
                    Submit Years in Barangay
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-[#d8e5f4] bg-[#f7fbff] p-4">
              <div className="mb-3">
                <h2 className="text-[15px] font-bold text-[#014384]">Digital ID Emergency Contact</h2>
                <p className="mt-1 text-sm leading-6 text-[#5c7aa3]">
                  These details will appear on the back of your Digital ID. You can update them anytime without repeating the full KK profiling form.
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="Emergency Contact Name"
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Example: Maria Santos"
                  hint="Required before your Digital ID can be generated or activated."
                />
                <Input
                  label="Relationship"
                  type="text"
                  value={emergencyContactRelationship}
                  onChange={(e) => setEmergencyContactRelationship(e.target.value)}
                  placeholder="Example: Mother, Father, Guardian, Sister"
                />
                <Input
                  label="Emergency Contact Phone"
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) =>
                    setEmergencyContactPhone(
                      normalizeEmergencyContactPhone(
                        e.target.value,
                        EMERGENCY_CONTACT_PHONE_MAX_LENGTH
                      )
                    )
                  }
                  placeholder="Example: 09171234567"
                  inputMode="numeric"
                  maxLength={EMERGENCY_CONTACT_PHONE_MAX_LENGTH}
                  hint="Use up to 11 characters for the contact number."
                />
              </div>
            </div>
            <Button type="submit" fullWidth isLoading={isLoading}>
              Save Changes
            </Button>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={Boolean(feedback)}
        title={feedback?.title}
        message={feedback?.message || ''}
        actionLabel={feedback?.actionLabel}
        tone={feedback?.tone}
        onClose={handleFeedbackClose}
      />

      <Modal
        isOpen={isYearsConfirmOpen}
        onClose={() => {
          if (!isYearsSubmitting) setIsYearsConfirmOpen(false)
        }}
        title="Confirm Years in Barangay"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-[#5c7aa3]">
            You are about to save <strong>{normalizedYearsInBarangay || '0'} year{normalizedYearsInBarangay === '1' ? '' : 's'}</strong> in Barangay. This is a one-time submission from your account. Continue?
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsYearsConfirmOpen(false)}
              disabled={isYearsSubmitting}
              fullWidth
            >
              Review
            </Button>
            <Button
              type="button"
              onClick={handleConfirmYearsSubmit}
              isLoading={isYearsSubmitting}
              fullWidth
            >
              Confirm & Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function normalizeEmergencyContactPhone(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function normalizeMemberContactNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, MEMBER_CONTACT_NUMBER_MAX_LENGTH)
}

function normalizeYearsInBarangay(value: string) {
  return value.replace(/\D/g, '')
}

function hasStoredYearsInBarangay(value: unknown) {
  if (value === null || typeof value === 'undefined' || String(value).trim() === '') {
    return false
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
}

function getYearsInBarangayError(value: string) {
  const normalized = normalizeYearsInBarangay(value)
  if (!normalized) return 'Enter your years in barangay.'
  if (!/^\d+$/.test(normalized)) return 'Years in Barangay must be a whole number.'

  return ''
}

function getMemberContactNumberError(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  if (!/^09\d{9}$/.test(trimmedValue)) {
    return 'Contact number must be 11 digits and start with 09.'
  }

  return ''
}

function normalizePurok(value: string) {
  const normalizedValue = value.trim().toUpperCase()

  if (normalizedValue === 'MANGGAHAN 1' || normalizedValue === 'MANGGAHAN 2') {
    return 'MANGGAHAN'
  }

  return PUROK_OPTIONS.includes(normalizedValue as (typeof PUROK_OPTIONS)[number])
    ? normalizedValue
    : ''
}
