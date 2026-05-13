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
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'

const MEMBER_CONTACT_NUMBER_MAX_LENGTH = 11
const EMERGENCY_CONTACT_PHONE_MAX_LENGTH = 11
const PUROK_OPTIONS = [
  'Aliw',
  'Ausmulo',
  'Bukid',
  'Gitna',
  'Ilaya',
  'Looban',
  'Manggahan 1',
  'Manggahan 2',
] as const

type SaveFeedbackState = {
  title: string
  message: string
  actionLabel: string
  tone: 'success' | 'error'
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
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<SaveFeedbackState | null>(null)
  const [showContactNumberValidation, setShowContactNumberValidation] = useState(false)

  const contactNumberError = showContactNumberValidation
    ? getMemberContactNumberError(contactNumber)
    : ''
  const purokOptions = getPurokOptions(purok)

  useEffect(() => {
    if (user) {
      setUsername(user.UserName || '')
      setEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setContactNumber(normalizeMemberContactNumber(profile.contactNumber || ''))
      setPurok(profile.purok || '')
      setEmergencyContactName(profile.digitalIdEmergencyContactName || '')
      setEmergencyContactRelationship(profile.digitalIdEmergencyContactRelationship || '')
      setEmergencyContactPhone(
        normalizeEmergencyContactPhone(
          profile.digitalIdEmergencyContactPhone || '',
          EMERGENCY_CONTACT_PHONE_MAX_LENGTH
        )
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
    const trimmedPurok = purok.trim()
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

  const handleFeedbackClose = () => {
    const shouldGoBack = feedback?.tone === 'success'
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
                  options={purokOptions}
                  placeholder="Select your purok / zone"
                  hint="Optional. This fills the Purok field below your home address."
                />
              </div>
            </div>
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
    </div>
  )
}

function normalizeEmergencyContactPhone(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function normalizeMemberContactNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, MEMBER_CONTACT_NUMBER_MAX_LENGTH)
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

function getPurokOptions(currentValue: string) {
  if (!currentValue || PUROK_OPTIONS.includes(currentValue as (typeof PUROK_OPTIONS)[number])) {
    return [...PUROK_OPTIONS]
  }

  return [currentValue, ...PUROK_OPTIONS]
}
