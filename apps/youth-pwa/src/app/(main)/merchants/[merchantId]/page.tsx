'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import Spinner from '@/components/ui/Spinner'
import type { Merchant } from '@/hooks/useMerchants'
import api from '@/lib/api'
import type { Reward } from '@/types/rewards'

type DetailTab = 'discounts' | 'terms'

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

  merchant.products
    ?.map((product) => String(product.category || '').trim())
    .filter(Boolean)
    .slice(0, 2)
    .forEach((value) => tags.add(value))

  return Array.from(tags).slice(0, 2)
}

function toBulletLines(content?: string) {
  if (!content) return []

  return content
    .split(/\r?\n|•|-/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export default function MerchantDetailPage() {
  const router = useRouter()
  const { merchantId } = useParams<{ merchantId: string }>()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [merchantRewards, setMerchantRewards] = useState<Reward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DetailTab>('discounts')

  useEffect(() => {
    let active = true

    void api
      .get(`/merchants/${merchantId}`)
      .then((response) => {
        if (!active) return
        setMerchant(response.data.merchant || response.data)
      })
      .catch(() => {
        if (!active) return
        setMerchant(null)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [merchantId])

  useEffect(() => {
    let active = true

    void api
      .get('/rewards', { params: { merchantId } })
      .then((response) => {
        if (!active) return
        setMerchantRewards(response.data.rewards || response.data || [])
      })
      .catch(() => {
        if (!active) return
        setMerchantRewards([])
      })

    return () => {
      active = false
    }
  }, [merchantId])

  const discountLines = useMemo(() => {
    if (!merchant) return []

    const manualLines = toBulletLines(merchant.discountInfo)
    const promotionLines =
      merchant.promotions?.map((promotion) =>
        [promotion.title, promotion.valueLabel].filter(Boolean).join(' - ')
      ) || []

    return [...manualLines, ...promotionLines].filter(Boolean)
  }, [merchant])

  const termLines = useMemo(() => toBulletLines(merchant?.termsAndConditions), [merchant])

  if (isLoading) return <Spinner fullPage />

  if (!merchant) {
    return (
      <div className="min-h-full bg-[#eaf3ff] px-5 py-20 text-center">
        <p className="text-xl font-black text-[#0d4f92]">Merchant not found</p>
        <p className="mt-2 text-sm text-[#6683a3]">This merchant is not available right now.</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#edf4ff] pb-28">
      <section className="relative h-[246px] overflow-hidden bg-[#0d4f92]">
        {getMerchantBanner(merchant) ? (
          <Image src={getMerchantBanner(merchant)} alt={merchant.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0d4f92_0%,#2e86de_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,53,108,0.18)_0%,rgba(5,53,108,0.7)_100%)]" />

        <div className="absolute inset-x-0 top-0 rounded-b-[32px] bg-[linear-gradient(180deg,#f9fbff_0%,#ffffff_100%)] px-4 pb-4 pt-4 shadow-[0_16px_30px_rgba(4,60,121,0.18)]">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f7ff] text-[#0d4f92]"
              aria-label="Go back"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 19-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-center text-[18px] font-black text-[#0d4f92]">Merchant Details</h1>
            <div />
          </div>
        </div>
      </section>

      <div className="-mt-12 px-4">
        <section className="rounded-[30px] bg-white px-4 pb-5 pt-4 shadow-[0_18px_36px_rgba(4,60,121,0.16)]">
          <div className="flex items-start gap-3">
            <div className="relative -mt-10 h-[74px] w-[74px] flex-shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#e7eef8] shadow-[0_10px_18px_rgba(4,60,121,0.16)]">
              {getMerchantLogo(merchant) ? (
                <Image src={getMerchantLogo(merchant)} alt={merchant.name} fill className="object-cover" />
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-[28px] font-black leading-none text-[#0d4f92]">{merchant.businessName || merchant.name}</h2>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-[#6c88a7]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#90a8c2]" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
                  <circle cx="12" cy="11" r="2" />
                </svg>
                <span className="line-clamp-1">{merchant.address}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {getMerchantTags(merchant).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#dce7f3] bg-[#f7fbff] px-3 py-1 text-[10px] font-bold text-[#0d4f92]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-[22px] border border-[#d7e3ef] bg-[#fbfdff] px-4 py-4">
            <p className="text-[13px] leading-6 text-[#476584]">
              {merchant.shortDescription || merchant.description || merchant.businessInfo || 'Merchant details coming soon.'}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 border-b border-[#dbe6f2]">
            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`pb-3 text-xs font-black ${
                activeTab === 'discounts' ? 'border-b-2 border-[#0d4f92] text-[#0d4f92]' : 'text-[#7a94b0]'
              }`}
            >
              Discount Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`pb-3 text-xs font-black ${
                activeTab === 'terms' ? 'border-b-2 border-[#0d4f92] text-[#0d4f92]' : 'text-[#7a94b0]'
              }`}
            >
              Terms & Conditions
            </button>
          </div>

          <div className="pt-4 text-[13px] leading-6 text-[#4a6684]">
            {activeTab === 'discounts' ? (
              discountLines.length > 0 ? (
                <ul className="space-y-2">
                  {discountLines.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#0d4f92]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No active discount details have been posted yet.</p>
              )
            ) : termLines.length > 0 ? (
              <ul className="space-y-2">
                {termLines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#0d4f92]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No terms and conditions have been added yet.</p>
            )}
          </div>
        </section>

        {merchant.promotions && merchant.promotions.length > 0 ? (
          <section id="merchant-offers" className="mt-4 rounded-[28px] bg-white px-4 py-5 shadow-[0_14px_30px_rgba(4,60,121,0.12)]">
            <h3 className="text-sm font-black text-[#0d4f92]">Current Offers</h3>
            <div className="mt-3 space-y-3">
              {merchant.promotions.map((promotion) => (
                <div key={promotion.id} className="overflow-hidden rounded-[22px] border border-[#dce7f3] bg-[#f9fbff]">
                  <div className="relative h-28 bg-[linear-gradient(135deg,#ffbe2e_0%,#ff8f21_100%)]">
                    {promotion.bannerUrl ? (
                      <Image src={promotion.bannerUrl} alt={promotion.title} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#0d4f92]">{promotion.title}</p>
                        {promotion.shortTagline ? (
                          <p className="mt-1 text-xs leading-5 text-[#6380a0]">{promotion.shortTagline}</p>
                        ) : null}
                      </div>
                      {promotion.valueLabel ? (
                        <span className="rounded-full bg-[#fff4d9] px-3 py-1 text-[10px] font-black text-[#f19b08]">
                          {promotion.valueLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {merchant.products && merchant.products.length > 0 ? (
          <section className="mt-4 rounded-[28px] bg-white px-4 py-5 shadow-[0_14px_30px_rgba(4,60,121,0.12)]">
            <h3 className="text-sm font-black text-[#0d4f92]">Products & Menu</h3>
            <div className="mt-3 space-y-3">
              {merchant.products.map((product) => (
                <div key={product.id} className="rounded-[20px] border border-[#dce7f3] bg-[#fbfdff] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-[#0d4f92]">{product.name}</p>
                      {product.description ? (
                        <p className="mt-1 text-xs leading-5 text-[#6480a0]">{product.description}</p>
                      ) : null}
                    </div>
                    {typeof product.price === 'number' ? (
                      <span className="text-xs font-black text-[#f09000]">PHP {product.price.toFixed(2)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {merchantRewards.length > 0 ? (
          <section id="merchant-rewards" className="mt-4 rounded-[28px] bg-white px-4 py-5 shadow-[0_14px_30px_rgba(4,60,121,0.12)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-[#0d4f92]">Rewards You Can Redeem</h3>
                <p className="mt-1 text-xs leading-5 text-[#6a86a4]">
                  Admin-created rewards for this merchant. Redeeming these spends your youth points.
                </p>
              </div>
              <Link
                href="/rewards"
                className="text-[11px] font-black uppercase tracking-[0.12em] text-[#f09000]"
              >
                All Rewards
              </Link>
            </div>

            <div className="mt-3 space-y-3">
              {merchantRewards.slice(0, 3).map((reward) => (
                <Link
                  key={reward.id}
                  href={`/rewards/${reward.id}`}
                  className="flex items-center gap-3 rounded-[20px] border border-[#dce7f3] bg-[#fbfdff] px-4 py-4"
                >
                  <div className="relative h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#f8c95b_0%,#f5a31d_100%)]">
                    {reward.imageUrl ? (
                      <Image src={reward.imageUrl} alt={reward.title} fill className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-black text-[#0d4f92]">{reward.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6480a0]">{reward.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#f09000]">{reward.points.toLocaleString('en-PH')} pts</p>
                    <p className="mt-2 text-[11px] font-black text-[#0d4f92]">View</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,rgba(237,244,255,0)_0%,rgba(237,244,255,0.92)_24%,#edf4ff_100%)] px-4 pb-[calc(1rem+var(--safe-area-inset-bottom))] pt-6">
        <button
          type="button"
          onClick={() => {
            if (merchantRewards.length === 1) {
              router.push(`/rewards/${merchantRewards[0].id}`)
              return
            }

            if (merchantRewards.length > 1) {
              document.getElementById('merchant-rewards')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              return
            }

            router.push('/scanner')
          }}
          className="mx-auto flex w-full max-w-md items-center justify-center rounded-full bg-[linear-gradient(90deg,#f8cb5b_0%,#f1b941_52%,#ffd77a_100%)] px-6 py-4 text-sm font-black text-white shadow-[0_18px_30px_rgba(241,185,65,0.34)]"
        >
          {merchantRewards.length === 1
            ? 'Redeem Reward'
            : merchantRewards.length > 1
              ? 'View Rewards'
              : 'Show Youth QR to Earn Points'}
        </button>
      </div>
    </div>
  )
}
