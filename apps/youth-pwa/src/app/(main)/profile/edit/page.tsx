'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import AlertModal from '@/components/ui/AlertModal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function EditProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [username, setUsername] = useState(user?.UserName || '')
  const [email] = useState(user?.email || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await api.patch('/users/me', { UserName: username })
      setSuccess(true)
      setTimeout(() => router.back(), 1500)
    } catch {
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
