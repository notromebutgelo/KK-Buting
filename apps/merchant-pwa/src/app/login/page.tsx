'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Store } from 'lucide-react'
import { signInMerchant } from '@/services/auth.service'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const user = await signInMerchant(email, password)
      setUser(user)
      router.replace(user.mustChangePassword ? '/change-password' : '/workspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="merchant-shell flex min-h-screen items-center justify-center px-5 py-10">
      <section className="surface w-full max-w-md overflow-hidden rounded-[2rem]">
        <div className="youth-gradient-band h-24" />
        <div className="p-6">
        <div className="-mt-16 mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FCB315]">Merchant PWA</p>
            <h1 className="mt-2 text-3xl font-black text-[color:var(--merchant-ink)]">Buting Merchants</h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--merchant-muted)]">Scan member QR codes, manage shop content, and monitor transactions.</p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl border-4 border-white bg-[#0f4c97] text-white shadow-[0_16px_28px_rgba(15,76,151,0.24)]">
            <Store className="h-7 w-7" />
          </div>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-bold text-slate-700">
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" type="email" autoComplete="email" required />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Password
            <span className="relative mt-2 block">
              <input value={password} onChange={(event) => setPassword(event.target.value)} className="field pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-500">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

          <button className="primary-button mt-2" disabled={isSubmitting} type="submit">
            <LockKeyhole className="h-4 w-4" />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        </div>
      </section>
    </main>
  )
}
