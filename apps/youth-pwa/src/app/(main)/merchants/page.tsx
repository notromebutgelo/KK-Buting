'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

import Spinner from '@/components/ui/Spinner'
import { type Merchant, useMerchants } from '@/hooks/useMerchants'

const FAVORITES_KEY = 'kk-favorite-merchants'

function getMerchantTags(merchant: Merchant) {
  const tags = new Set<string>()

  String(merchant.category || '')
    .split(/[,&/|]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 2)
    .forEach((value) => tags.add(value))

  merchant.products
    ?.map((product) => String(product.category || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .forEach((value) => tags.add(value))

  return Array.from(tags).slice(0, 2)
}

function getMerchantCover(merchant: Merchant) {
  return merchant.bannerUrl || merchant.imageUrl || merchant.logoUrl || ''
}

function getMerchantLogo(merchant: Merchant) {
  return merchant.logoUrl || merchant.imageUrl || merchant.bannerUrl || ''
}

export default function MerchantsPage() {
  const { merchants, isLoading, error } = useMerchants()
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)

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

  const approved = useMemo(
    () => merchants.filter((merchant) => merchant.status === 'approved'),
    [merchants]
  )

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return approved

    return approved.filter((merchant) =>
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
  }, [approved, query])

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedMerchantId(null)
      return
    }

    setSelectedMerchantId((current) =>
      current && filtered.some((merchant) => merchant.id === current) ? current : filtered[0].id
    )
  }, [filtered])

  const selectedMerchant = useMemo(
    () => filtered.find((merchant) => merchant.id === selectedMerchantId) || filtered[0] || null,
    [filtered, selectedMerchantId]
  )

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
    <div className="min-h-full bg-[#0a5ca8] pb-24">
      <section className="rounded-b-[34px] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 pb-5 pt-4 shadow-[0_18px_34px_rgba(0,54,122,0.18)]">
        <div className="flex items-center justify-center py-3">
          <h1 className="text-[22px] font-black tracking-[-0.02em] text-[#0c4f93]">Merchants</h1>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-full border border-[#d7e6f8] bg-[#f7fbff] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#f0a722]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21 21-4.35-4.35" />
            <circle cx="11" cy="11" r="6" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a Merchant..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#35577c] outline-none placeholder:text-[#8ca6c4]"
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff1cc] text-[#f0a722]"
            aria-label="Merchant filters"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M7 12h10" />
              <path d="M10 17h4" />
            </svg>
          </button>
        </div>
      </section>

      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] bg-white/95 px-6 py-10 text-center text-sm font-semibold text-red-500 shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[28px] bg-white/95 px-6 py-12 text-center shadow-[0_14px_30px_rgba(4,60,121,0.2)]">
            <p className="text-lg font-black text-[#0d4f92]">No merchants found</p>
            <p className="mt-2 text-sm text-[#6d87a4]">Try a different keyword or check back later.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedMerchant ? (
              <section>
                <div
                  key={selectedMerchant.id}
                  className="overflow-hidden rounded-[24px] border-[3px] border-[#ffbf2a] bg-white shadow-[0_14px_30px_rgba(4,60,121,0.26)] transition-all duration-300"
                >
                  <div className="relative h-[128px] bg-[linear-gradient(135deg,#0f5ca9_0%,#0e3769_100%)]">
                    {getMerchantCover(selectedMerchant) ? (
                      <Image
                        src={getMerchantCover(selectedMerchant)}
                        alt={selectedMerchant.name}
                        fill
                        className="object-cover transition-all duration-500"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.55)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {getMerchantTags(selectedMerchant).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold text-[#114d88]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 px-4 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedMerchantId(selectedMerchant.id)}
                      className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-[18px] border-[3px] border-[#ffbf2a] bg-[#fff8de]"
                      aria-label={`Selected merchant ${selectedMerchant.businessName || selectedMerchant.name}`}
                    >
                      {getMerchantLogo(selectedMerchant) ? (
                        <Image
                          src={getMerchantLogo(selectedMerchant)}
                          alt={selectedMerchant.name}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[18px] font-black text-[#0d4f92]">
                        {selectedMerchant.businessName || selectedMerchant.name}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#7c96b4]">
                        {selectedMerchant.address}
                      </p>
                      <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-[#56728f]">
                        {selectedMerchant.shortDescription || selectedMerchant.description || selectedMerchant.businessInfo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[#e5eef8] px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {getMerchantTags(selectedMerchant).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#d6e3f0] bg-[#f8fbff] px-3 py-1 text-[10px] font-bold text-[#0d4f92]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/merchants/${selectedMerchant.id}`}
                      className="text-[11px] font-black text-[#f39100]"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-base font-black text-white">Recommended Merchants</h2>
              <div className="mt-3 space-y-4">
                {filtered.map((merchant, index) => {
                  const isFavorite = favorites.includes(merchant.id)
                  const isSelected = merchant.id === selectedMerchant?.id
                  const cardAccent =
                    index % 2 === 0
                      ? 'bg-[linear-gradient(135deg,#ffbd2f_0%,#ff9f17_100%)]'
                      : 'bg-[linear-gradient(135deg,#0d4f92_0%,#0f67bf_100%)]'
                  const cardFrame =
                    index % 2 === 0
                      ? 'bg-[linear-gradient(180deg,#ffbd2f_0%,#ffb11d_100%)]'
                      : 'bg-[linear-gradient(180deg,#0d4f92_0%,#0c5cad_100%)]'
                  const buttonText = index % 2 === 0 ? 'text-[#f39100]' : 'text-[#0d4f92]'

                  return (
                    <article
                      key={merchant.id}
                      className={`overflow-hidden rounded-[24px] p-[3px] shadow-[0_14px_28px_rgba(4,60,121,0.24)] transition-transform duration-300 ${cardFrame} ${
                        isSelected ? 'scale-[1.01]' : ''
                      }`}
                    >
                      <div
                        className={`rounded-[21px] bg-white px-3 pb-4 pt-3 transition-colors duration-300 ${
                          isSelected ? 'ring-2 ring-[#ffd36c]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedMerchantId(merchant.id)}
                            className={`relative h-[74px] w-[74px] flex-shrink-0 overflow-hidden rounded-[18px] ${cardAccent}`}
                            aria-label={`Preview ${merchant.businessName || merchant.name}`}
                          >
                            {getMerchantLogo(merchant) ? (
                              <Image src={getMerchantLogo(merchant)} alt={merchant.name} fill className="object-cover" />
                            ) : null}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMerchantId(merchant.id)}
                                  className="block text-left"
                                >
                                  <h3 className="line-clamp-1 text-[15px] font-black text-[#0d4f92]">
                                    {merchant.businessName || merchant.name}
                                  </h3>
                                </button>
                                <p className="mt-1 line-clamp-1 text-[10px] font-semibold text-[#7c96b4]">{merchant.address}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFavorite(merchant.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ffd2dd] bg-white text-[#e73d6f] shadow-[0_8px_14px_rgba(231,61,111,0.16)]"
                                aria-label={isFavorite ? 'Remove favorite merchant' : 'Add favorite merchant'}
                              >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                  <path d="m12 21-1.45-1.32C5.4 15.04 2 11.97 2 8.2 2 5.13 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.13 22 8.2c0 3.77-3.4 6.84-8.55 11.49z" />
                                </svg>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedMerchantId(merchant.id)}
                              className="mt-2 block text-left"
                            >
                              <p className="line-clamp-3 text-[11px] leading-4 text-[#56728f]">
                                {merchant.shortDescription || merchant.description || merchant.businessInfo}
                              </p>
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {getMerchantTags(merchant).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[#d6e3f0] bg-[#f8fbff] px-3 py-1 text-[10px] font-bold text-[#0d4f92]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <Link
                            href={`/merchants/${merchant.id}`}
                            className={`text-[11px] font-black ${buttonText}`}
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
