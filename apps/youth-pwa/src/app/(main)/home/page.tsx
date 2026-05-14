'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  ChevronRight,
  Gift,
  Heart,
  Star,
  Store,
} from 'lucide-react'

import api from '@/lib/api'
import { useMerchants } from '@/hooks/useMerchants'
import { useUser } from '@/hooks/useUser'
import { getMyNotifications } from '@/services/notifications.service'
import { getActivePromotions, type YouthPromotion } from '@/services/promotions.service'
import { useAuthStore } from '@/store/authStore'

interface PointsData {
  totalPoints: number
  earnedPoints: number
  redeemedPoints: number
}

interface FeaturedMerchantCard {
  id: string
  name: string
  description: string
  imageUrl: string
  logoUrl: string
  href: string
}

export default function HomePage() {
  const { user } = useAuthStore()
  const { profile } = useUser()
  const { merchants, isLoading: merchantsLoading } = useMerchants()
  const [points, setPoints] = useState<PointsData | null>(null)
  const [pointsLoading, setPointsLoading] = useState(true)
  const [promotions, setPromotions] = useState<YouthPromotion[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(true)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const [activePromo, setActivePromo] = useState(0)
  const [activeFeaturedMerchant, setActiveFeaturedMerchant] = useState(0)

  useEffect(() => {
    api
      .get('/points/me')
      .then((res) => setPoints(res.data))
      .catch(() =>
        setPoints({ totalPoints: 0, earnedPoints: 0, redeemedPoints: 0 })
      )
      .finally(() => setPointsLoading(false))
  }, [])

  useEffect(() => {
    let active = true

    getMyNotifications()
      .then((notifications) => {
        if (active) {
          setHasUnreadNotifications(
            notifications.some((notification) => !notification.read)
          )
        }
      })
      .catch(() => {
        if (active) {
          setHasUnreadNotifications(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getActivePromotions()
      .then((nextPromotions) => {
        if (active) {
          setPromotions(nextPromotions.filter((promotion) => promotion.title))
        }
      })
      .catch(() => {
        if (active) {
          setPromotions([])
        }
      })
      .finally(() => {
        if (active) {
          setPromotionsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const approvedMerchants = useMemo(
    () => merchants.filter((merchant) => merchant.status === 'approved'),
    [merchants]
  )

  const featuredMerchants = useMemo<FeaturedMerchantCard[]>(
    () =>
      approvedMerchants.slice(0, 3).map((merchant) => ({
        id: merchant.id,
        name: merchant.businessName || merchant.name,
        description:
          merchant.shortDescription ||
          merchant.description ||
          merchant.businessInfo ||
          '',
        imageUrl: merchant.bannerUrl || merchant.imageUrl || merchant.logoUrl || '',
        logoUrl: merchant.logoUrl || merchant.imageUrl || merchant.bannerUrl || '',
        href: `/merchants/${merchant.id}`,
      })),
    [approvedMerchants]
  )

  useEffect(() => {
    if (featuredMerchants.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveFeaturedMerchant((current) =>
        current === featuredMerchants.length - 1 ? 0 : current + 1
      )
    }, 3200)

    return () => {
      window.clearInterval(interval)
    }
  }, [featuredMerchants.length])

  useEffect(() => {
    setActiveFeaturedMerchant((current) =>
      current >= featuredMerchants.length ? 0 : current
    )
  }, [featuredMerchants.length])

  useEffect(() => {
    if (promotions.length <= 1) return

    const interval = window.setInterval(() => {
      setActivePromo((current) =>
        current === promotions.length - 1 ? 0 : current + 1
      )
    }, 4200)

    return () => {
      window.clearInterval(interval)
    }
  }, [promotions.length])

  useEffect(() => {
    setActivePromo((current) => (current >= promotions.length ? 0 : current))
  }, [promotions.length])

  const featuredMerchant =
    featuredMerchants[activeFeaturedMerchant] || featuredMerchants[0] || null
  const partnerMerchants = approvedMerchants.slice(0, 4)
  const activePromotion = promotions[activePromo] || promotions[0] || null

  const displayName = formatDisplayName(
    profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      : user?.UserName || 'Youth Member'
  )

  const greeting = getGreeting()
  const memberSinceYear = getMemberSinceYear()
  const pointsValue = points?.totalPoints || 0
  const progressWidth = Math.min(
    100,
    Math.max(pointsValue > 0 ? 18 : 12, (pointsValue / 3000) * 100)
  )

  return (
    <div className="min-h-screen bg-[#f5f7fb] pb-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] text-[#0f4c97]">
      <div className="mx-auto max-w-[460px] px-5">
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(201,224,248,0.72),rgba(255,255,255,0.95)_44%,rgba(255,255,255,1)_100%)] px-5 pb-5 pt-5 shadow-[0_18px_40px_rgba(15,76,151,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#0f4c97] bg-[radial-gradient(circle_at_top_left,#f2f8ff_0%,#dfeeff_100%)] text-[24px] font-black tracking-[-0.03em] text-[#0f4c97] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {getInitials(displayName)}
                <span className="absolute -bottom-[1px] -right-[2px] h-3 w-3 rounded-full border-2 border-white bg-[#34c759] shadow-[0_6px_14px_rgba(52,199,89,0.18)]" />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-[#5a6880]">
                  {greeting}
                </p>
                <h1 className="mt-1 text-[22px] font-black leading-[1.08] tracking-[-0.04em] text-[#0f4c97] [overflow-wrap:anywhere]">
                  {displayName}
                </h1>
                <div className="mt-2 inline-flex items-center rounded-full bg-[#e8f0ff] px-3 py-1.5 text-[12px] font-semibold text-[#4480e2] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  Member since {memberSinceYear}
                </div>
              </div>
            </div>

            <Link
              href="/profile/notifications"
              className="relative inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/88 text-[#0f4c97] shadow-[0_10px_24px_rgba(15,76,151,0.12)]"
              aria-label="Open notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={2.1} />
              {hasUnreadNotifications ? (
                <span className="absolute right-[7px] top-[7px] h-2.5 w-2.5 rounded-full bg-[#ff4d4f]" />
              ) : null}
            </Link>
          </div>

          <div className="mt-5 rounded-[20px] bg-white px-4 py-4 shadow-[0_18px_34px_rgba(15,76,151,0.08)]">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff5dc] text-[#f7ae18] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <Star className="h-6 w-6" strokeWidth={2.1} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#163a70]">
                    Points Balance
                  </h2>
                  <p className="text-[16px] font-bold tracking-[-0.02em] text-[#4480e2]">
                    {pointsLoading ? '...' : `${formatPoints(pointsValue)} points`}
                  </p>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#eef2f8]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#fcb315_0%,#ffb000_62%,#f7a60c_100%)] shadow-[0_8px_16px_rgba(252,179,21,0.28)]"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[13px] leading-[1.45] text-[#5f6d83]">
                    Earn more points to unlock exciting rewards!
                  </p>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f7f9fd] text-[#7d8fa8]">
                    <ChevronRight className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionHeader
          title="Featured Merchant"
          action={{ href: '/merchants', label: 'View all' }}
        />
        {merchantsLoading ? (
          <StateCard
            title="Loading merchants..."
            copy="Fetching approved merchant storefronts from the server."
          />
        ) : featuredMerchant ? (
          <div className="mt-3">
            <Link
              href={featuredMerchant.href}
              className="block rounded-[24px] text-[#163a70]"
            >
              <div className="rounded-[24px] bg-transparent">
                <div className="relative h-[188px] w-full overflow-hidden rounded-[24px] shadow-[0_18px_36px_rgba(15,76,151,0.12)]">
                  {featuredMerchant.imageUrl ? (
                    <Image
                      src={featuredMerchant.imageUrl}
                      alt={featuredMerchant.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#dceafd_0%,#9bbde7_100%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f223d]/10 via-transparent to-transparent" />
                  <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#314766] shadow-[0_16px_28px_rgba(15,76,151,0.16)]">
                    <Heart className="h-4.5 w-4.5" strokeWidth={2.1} />
                  </div>
                </div>

                <div className="-mt-10 px-0 pb-2">
                  <div className="relative z-10 rounded-[24px] bg-white px-4 pb-5 pt-4 shadow-[0_18px_38px_rgba(15,76,151,0.12)]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#fff6df] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        {featuredMerchant.logoUrl ? (
                          <Image
                            src={featuredMerchant.logoUrl}
                            alt={`${featuredMerchant.name} logo`}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-6 w-6 text-[#f7ae18]" strokeWidth={2.2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-black leading-tight tracking-[-0.03em] text-[#0f4c97]">
                          {featuredMerchant.name}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-[1.7] text-[#58697f]">
                          {featuredMerchant.description ||
                            'This merchant has not added a storefront description yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {featuredMerchants.length > 1 ? (
              <div className="mt-3 flex justify-center gap-2">
                {featuredMerchants.map((merchant, index) => (
                  <button
                    key={merchant.id}
                    type="button"
                    aria-label={`Show ${merchant.name}`}
                    onClick={() => setActiveFeaturedMerchant(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeFeaturedMerchant
                        ? 'w-[28px] bg-[#0f4c97]'
                        : 'w-2.5 bg-[#d5ddea]'
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <StateCard
            title="No featured merchants yet"
            copy="Approved merchant storefronts will appear here once they are available."
          />
        )}

        <SectionHeader
          title="Partner Shops"
          action={{ href: '/merchants', label: 'View all' }}
        />
        {partnerMerchants.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-[20px] bg-white px-5 py-3 shadow-[0_16px_30px_rgba(15,76,151,0.08)]">
            <div className="flex items-center gap-3">
              <div className="grid min-w-0 flex-1 grid-cols-4 gap-3 pr-1">
                {partnerMerchants.map((merchant, index) => (
                  <Link
                    key={merchant.id || merchant.name || index}
                    href={`/merchants/${merchant.id}`}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#f5f7fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                  >
                    {merchant.logoUrl || merchant.imageUrl ? (
                      <Image
                        src={merchant.logoUrl || merchant.imageUrl}
                        alt={merchant.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-center text-[9px] font-black uppercase leading-tight text-[#0f4c97]">
                        {getInitials(merchant.name)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <Link
                href="/merchants"
                className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#edf4ff] text-[#0f4c97] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
                aria-label="See all partner shops"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.3} />
              </Link>
            </div>
          </div>
        ) : (
          <StateCard
            title="No partner shops yet"
            copy="Merchant partners will show up here once approved storefronts are live."
          />
        )}

        <SectionHeader title="Promotions" />
        {promotionsLoading ? (
          <StateCard
            title="Loading promotions..."
            copy="Fetching the latest active merchant promotions."
          />
        ) : activePromotion ? (
          <Link
            href={activePromotion.merchantId ? `/merchants/${activePromotion.merchantId}` : '/merchants'}
            className="mt-3 block overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top_left,rgba(227,238,255,0.95),rgba(241,247,255,0.92)_52%,rgba(232,242,255,0.96)_100%)] px-5 py-5 shadow-[0_18px_34px_rgba(15,76,151,0.09)]"
          >
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#0f4c97]">
                  {activePromotion.title}
                </p>
                <p className="mt-3 max-w-[220px] text-[13px] leading-[1.5] text-[#5a6980]">
                  {activePromotion.description ||
                    (activePromotion.merchantName
                      ? `Now live at ${activePromotion.merchantName}.`
                      : 'Open the merchant page to view the full promotion details.')}
                </p>
              </div>
              <PromoGiftArt />
            </div>
          </Link>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top_left,rgba(227,238,255,0.95),rgba(241,247,255,0.92)_52%,rgba(232,242,255,0.96)_100%)] px-5 py-5 shadow-[0_18px_34px_rgba(15,76,151,0.09)]">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#0f4c97]">
                  Exciting promos
                  <br />
                  coming your way!
                </p>
                <p className="mt-3 max-w-[200px] text-[13px] leading-[1.55] text-[#5a6980]">
                  Check back soon for exclusive offers and deals.
                </p>
              </div>
              <PromoGiftArt />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="mb-3 mt-6 flex items-center justify-between">
      <h2 className="text-[16px] font-black tracking-[-0.03em] text-[#0f4c97]">
        {title}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="text-[13px] font-semibold text-[#4f8bf0]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

function StateCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mt-3 rounded-[20px] bg-white px-5 py-8 text-center shadow-[0_16px_30px_rgba(15,76,151,0.08)]">
      <p className="text-[17px] font-black tracking-[-0.03em] text-[#0f4c97]">
        {title}
      </p>
      <p className="mt-2 text-[13px] leading-[1.6] text-[#617086]">{copy}</p>
    </div>
  )
}

function PromoGiftArt() {
  return (
    <div className="relative flex h-[104px] w-[104px] flex-shrink-0 items-center justify-center">
      <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.92),rgba(210,227,255,0.2))]" />
      <div className="absolute left-4 top-4 h-2 w-2 rounded-full bg-[#f5b522]" />
      <div className="absolute right-6 top-3 h-1.5 w-1.5 rounded-full bg-[#4da6ff]" />
      <div className="absolute bottom-5 left-2 h-1.5 w-1.5 rounded-full bg-[#f5b522]" />
      <div className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-[#4da6ff]" />
      <div className="relative flex h-[74px] w-[74px] items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#1b63bf_0%,#0f4c97_100%)] shadow-[0_18px_28px_rgba(15,76,151,0.24)]">
        <Gift className="h-9 w-9 text-white" strokeWidth={2.1} />
        <div className="absolute inset-y-0 left-1/2 w-2.5 -translate-x-1/2 bg-[#f6c24d]" />
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 bg-[#f6c24d]" />
      </div>
    </div>
  )
}

function formatDisplayName(value: string) {
  const parts = value.split(' ').filter(Boolean)
  if (parts.length <= 2) {
    return parts.join(' ')
  }

  return `${parts[0]} ${parts[parts.length - 1]}`
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-PH').format(value)
}

function getInitials(value: string) {
  const parts = value.split(' ').filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good morning!'
  }

  if (hour < 18) {
    return 'Good afternoon!'
  }

  return 'Good evening!'
}

function getMemberSinceYear() {
  return String(new Date().getFullYear())
}
