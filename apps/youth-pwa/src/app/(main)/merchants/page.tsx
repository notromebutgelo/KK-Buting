'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import AlertModal from '@/components/ui/AlertModal'
import Spinner from '@/components/ui/Spinner'
import { type Merchant, useMerchants } from '@/hooks/useMerchants'

const FAVORITES_KEY = 'kk-favorite-merchants'

function getMerchantBanner(merchant: Merchant) {
  return merchant.bannerUrl || merchant.imageUrl || merchant.logoUrl || ''
}

function getMerchantLogo(merchant: Merchant) {
  return merchant.logoUrl || merchant.imageUrl || merchant.bannerUrl || ''
}

function getMerchantTags(merchant: Merchant) {
  const tags = new Set<string>()

  String(merchant.category || '')
    .split(/[,&/|]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .forEach((value) => tags.add(value))

  return Array.from(tags).slice(0, 2)
}

function getMerchantDescription(merchant: Merchant) {
  return merchant.shortDescription || merchant.description || merchant.businessInfo || ''
}

export default function MerchantsPage() {
  const router = useRouter()
  const { merchants, isLoading, error } = useMerchants()
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [expandedMerchantId, setExpandedMerchantId] = useState<string | null>(null)
  const [isErrorDismissed, setIsErrorDismissed] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        setFavorites(JSON.parse(stored) as string[])
      }
    } catch {
      setFavorites([])
    }
  }, [])

  const approvedMerchants = useMemo(
    () => merchants.filter((merchant) => merchant.status === 'approved'),
    [merchants]
  )

  const filteredMerchants = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return approvedMerchants

    return approvedMerchants.filter((merchant) =>
      [
        merchant.name,
        merchant.businessName,
        merchant.category,
        merchant.description,
        merchant.shortDescription,
        merchant.address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    )
  }, [approvedMerchants, query])

  useEffect(() => {
    if (!filteredMerchants.length) {
      setExpandedMerchantId(null)
      return
    }

    setExpandedMerchantId((current) =>
      current && filteredMerchants.some((merchant) => merchant.id === current)
        ? current
        : filteredMerchants[0].id
    )
  }, [filteredMerchants])

  useEffect(() => {
    setIsErrorDismissed(false)
  }, [error])

  const toggleFavorite = (merchantId: string) => {
    setFavorites((current) => {
      const next = current.includes(merchantId)
        ? current.filter((id) => id !== merchantId)
        : [...current, merchantId]

      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#0b5fad_0%,#0d4f92_24%,#edf3fb_24%,#edf3fb_100%)] pb-24">
      <section className="rounded-b-[34px] bg-white px-4 pb-5 pt-4 shadow-[0_16px_30px_rgba(4,60,121,0.2)]">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf4fb] text-[#0d4f92]"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 19-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-center text-[20px] font-black text-[#0d4f92]">Merchants</h1>
          <div />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-full border border-[#d8e6f6] bg-[#f8fbff] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#f2b32a]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21 21-4.35-4.35" />
            <circle cx="11" cy="11" r="6" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a Merchant..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#35577c] outline-none placeholder:text-[#8ca6c4]"
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1cc] text-[#f2b32a]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M7 12h10" />
              <path d="M10 17h4" />
            </svg>
          </div>
        </div>
      </section>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            <p className="text-lg font-black text-[#0d4f92]">No merchants found</p>
            <p className="mt-2 text-sm text-[#6d87a4]">Try a different keyword or check back later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMerchants.map((merchant, index) => {
              const expanded = expandedMerchantId === merchant.id
              const isFavorite = favorites.includes(merchant.id)
              const frameClass =
                index % 2 === 0
                  ? 'bg-[linear-gradient(180deg,#ffbf2a_0%,#f1a31c_100%)]'
                  : 'bg-[linear-gradient(180deg,#0f5da7_0%,#113f79_100%)]'
              const accentText = index % 2 === 0 ? 'text-[#f09300]' : 'text-[#0d4f92]'

              return (
                <article
                  key={merchant.id}
                  className={`overflow-hidden rounded-[26px] p-[4px] shadow-[0_14px_28px_rgba(4,60,121,0.24)] transition-all duration-300 ${frameClass}`}
                >
                  <div className="rounded-[22px] bg-white">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedMerchantId((current) => (current === merchant.id ? null : merchant.id))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setExpandedMerchantId((current) => (current === merchant.id ? null : merchant.id))
                        }
                      }}
                      className="block w-full cursor-pointer text-left"
                    >
                      <div className="relative h-[148px] overflow-hidden rounded-t-[22px] bg-[linear-gradient(135deg,#e6eef8_0%,#b9d3ef_100%)]">
                        {getMerchantBanner(merchant) ? (
                          <Image
                            src={getMerchantBanner(merchant)}
                            alt={merchant.businessName || merchant.name}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.18)_100%)]" />
                      </div>

                      <div className="px-4 pb-4 pt-3">
                        <div className="flex items-start gap-3">
                          <div className="relative -mt-9 h-[66px] w-[66px] flex-shrink-0 overflow-hidden rounded-[20px] border-[3px] border-white bg-[#f8fbff] shadow-[0_10px_18px_rgba(4,60,121,0.12)]">
                            {getMerchantLogo(merchant) ? (
                              <Image
                                src={getMerchantLogo(merchant)}
                                alt={merchant.businessName || merchant.name}
                                fill
                                className="object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0 flex-1 pt-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-[19px] font-black text-[#0d4f92]">
                                  {merchant.businessName || merchant.name}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#7d95b0]">
                                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#98aec7]" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
                                    <circle cx="12" cy="11" r="2" />
                                  </svg>
                                  <span className="line-clamp-1">{merchant.address}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  toggleFavorite(merchant.id)
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffd4df] bg-white text-[#e83b6f] shadow-[0_10px_16px_rgba(232,59,111,0.18)]"
                                aria-label={isFavorite ? 'Remove favorite merchant' : 'Add favorite merchant'}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                  <path d="m12 21-1.45-1.32C5.4 15.04 2 11.97 2 8.2 2 5.13 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.13 22 8.2c0 3.77-3.4 6.84-8.55 11.49z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="pt-4">
                            {getMerchantDescription(merchant) ? (
                              <p className="text-[13px] leading-5 text-[#58718e]">
                                {getMerchantDescription(merchant)}
                              </p>
                            ) : (
                              <p className="text-[13px] leading-5 text-[#7e94ad]">
                                This merchant has not added a storefront description yet.
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              {getMerchantTags(merchant).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-[#d7e3ef] bg-[#f8fbff] px-3 py-1 text-[10px] font-bold text-[#0d4f92]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4 flex items-center justify-end">
                              <Link
                                href={`/merchants/${merchant.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className={`rounded-full bg-white px-4 py-2 text-[11px] font-black shadow-[0_10px_18px_rgba(4,60,121,0.08)] ${accentText}`}
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <AlertModal
        isOpen={Boolean(error) && !isErrorDismissed}
        title="Merchants Unavailable"
        message={error || ''}
        onClose={() => setIsErrorDismissed(true)}
      />
    </div>
  )
}
