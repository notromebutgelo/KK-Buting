'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseAuth } from '@/lib/firebase'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = auth.onAuthStateChanged((user) => {
      router.replace(user ? '/workspace' : '/login')
    })
    return unsubscribe
  }, [router])

  return (
    <main className="merchant-shell grid min-h-screen place-items-center px-6">
      <div className="surface w-full max-w-sm rounded-[2rem] p-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--merchant-blue)] text-lg font-black text-white">
          KK
        </div>
        <p className="text-sm font-semibold text-slate-600">Opening merchant workspace...</p>
      </div>
    </main>
  )
}
