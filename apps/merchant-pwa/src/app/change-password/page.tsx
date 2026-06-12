'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { getFirebaseAuth } from '@/lib/firebase'
import { changeMerchantPassword } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

export default function ChangePasswordPage() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) router.replace('/login')
    })
    return unsubscribe
  }, [router])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (nextPassword.length < 8) {
      setError('Use at least 8 characters for the new password.')
      return
    }

    if (nextPassword !== confirmPassword) {
      setError('The new password confirmation does not match.')
      return
    }

    setIsSaving(true)
    try {
      const user = await changeMerchantPassword(currentPassword, nextPassword)
      setUser(user)
      router.replace('/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="merchant-shell flex min-h-screen items-center justify-center px-5 py-10">
      <section className="surface w-full max-w-md rounded-[2rem] p-6">
        <div className="mb-7 grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--merchant-gold)] text-[color:var(--merchant-ink)]">
          <KeyRound className="h-7 w-7" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[color:var(--merchant-teal)]">Required</p>
        <h1 className="mt-2 text-3xl font-black">Change Temporary Password</h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--merchant-muted)]">Set a private password before accessing the merchant workspace.</p>

        <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
          <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="field" type="password" placeholder="Temporary password" autoComplete="current-password" required />
          <input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className="field" type="password" placeholder="New password" autoComplete="new-password" required />
          <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field" type="password" placeholder="Confirm new password" autoComplete="new-password" required />

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Save Password'}
          </button>
        </form>
      </section>
    </main>
  )
}
