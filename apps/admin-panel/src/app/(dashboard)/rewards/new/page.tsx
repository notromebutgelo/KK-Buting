'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface Merchant {
  id: string
  name: string
}

export default function NewRewardPage() {
  const router = useRouter()
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    points: '',
    category: 'food' as 'food' | 'services' | 'others',
    merchantId: '',
    validDays: '30',
    imageUrl: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get('/admin/merchants?status=approved')
      .then((res) => setMerchants(res.data.merchants || res.data))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.merchantId) { setError('Please select a merchant.'); return }
    setIsLoading(true)
    try {
      await api.post('/admin/rewards', {
        ...form,
        points: parseInt(form.points),
        validDays: parseInt(form.validDays),
      })
      setSuccess(true)
      setTimeout(() => router.push('/rewards'), 1500)
    } catch {
      setError('Failed to create reward. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const InputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-black text-gray-900">Add New Reward</h1>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Reward created successfully! Redirecting...
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={InputClass} placeholder="e.g. Free Meal Deal" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={InputClass} rows={3} placeholder="Describe the reward..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Points Required *</label>
              <input type="number" value={form.points} onChange={(e) => setForm(f => ({ ...f, points: e.target.value }))} className={InputClass} placeholder="100" min="1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valid Days *</label>
              <input type="number" value={form.validDays} onChange={(e) => setForm(f => ({ ...f, validDays: e.target.value }))} className={InputClass} min="1" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value as typeof form.category }))} className={InputClass}>
              <option value="food">Food</option>
              <option value="services">Services</option>
              <option value="others">Others</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Merchant *</label>
            <select value={form.merchantId} onChange={(e) => setForm(f => ({ ...f, merchantId: e.target.value }))} className={InputClass} required>
              <option value="">Select a merchant</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL (optional)</label>
            <input type="url" value={form.imageUrl} onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))} className={InputClass} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Reward
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
