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
import Spinner from '@/components/ui/Spinner'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, setUser, isLoading: isAuthLoading } = useAuthStore()
  const { profile, isLoading: isProfileLoading } = useUser()
  const { setProfile } = useUserStore()

  const [username, setUsername] = useState(user?.UserName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.UserName || '')
      setEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setEmergencyContactName(profile.digitalIdEmergencyContactName || '')
      setEmergencyContactRelationship(profile.digitalIdEmergencyContactRelationship || '')
      setEmergencyContactPhone(profile.digitalIdEmergencyContactPhone || '')
    }
  }, [profile])

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login')
    }
  }, [isAuthLoading, router, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const trimmedUsername = username.trim()
    const trimmedContactName = emergencyContactName.trim()
    const trimmedContactRelationship = emergencyContactRelationship.trim()
    const trimmedContactPhone = emergencyContactPhone.trim()
    const hasAnyEmergencyContactField = Boolean(
      trimmedContactName || trimmedContactRelationship || trimmedContactPhone
    )
    const hasCompleteEmergencyContact = Boolean(
      trimmedContactName && trimmedContactRelationship && trimmedContactPhone
    )

    if (hasAnyEmergencyContactField && !hasCompleteEmergencyContact) {
      setError('Please complete all emergency contact fields or leave them all blank.')
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
          digitalIdEmergencyContactName: trimmedContactName,
          digitalIdEmergencyContactRelationship: trimmedContactRelationship,
          digitalIdEmergencyContactPhone: trimmedContactPhone,
          digitalIdEmergencyContactComplete: hasCompleteEmergencyContact,
        })
      }

      setSuccess(true)
      setTimeout(() => router.back(), 1500)
    } catch {
      setError('Failed to update your profile details. Please try again.')
    } finally {
      setIsLoading(false)
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
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            Profile updated successfully!
          </div>
        )}
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
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="Example: 09171234567"
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
        isOpen={Boolean(error)}
        title="Profile Update Failed"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}
