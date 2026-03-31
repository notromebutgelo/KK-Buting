'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUser } from '@/hooks/useUser'
import { useMerchants } from '@/hooks/useMerchants'

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
  href: string
}

interface PartnerMerchantFallback {
  id?: string
  name: string
  imageUrl: string
}

const promotions = [
  {
    title: 'TreeHouse Coffee',
    subtitle: 'Get special youth-member perks when you visit partner cafes.',
  },
  {
    title: 'Digital ID Ready',
    subtitle: 'Complete verification to unlock your digital membership card.',
  },
]

export default function HomePage() {
  const { user } = useAuthStore()
  const { profile } = useUser()
  const { merchants, isLoading: merchantsLoading } = useMerchants()
  const [points, setPoints] = useState<PointsData | null>(null)
  const [pointsLoading, setPointsLoading] = useState(true)
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

  const approvedMerchants = useMemo(
    () => merchants.filter((merchant) => merchant.status === 'approved'),
    [merchants]
  )

  const featuredMerchants = useMemo<FeaturedMerchantCard[]>(() => {
    if (approvedMerchants.length > 0) {
      return approvedMerchants.slice(0, 3).map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        description:
          merchant.description ||
          "A trusted partner shop in Brgy. Buting's growing youth network.",
        imageUrl: merchant.imageUrl || '/images/treehouse.jpg',
        href: `/merchants/${merchant.id}`,
      }))
    }

    return [
      {
        id: 'treehouse',
        name: 'TreeHouse',
        description:
          "Your neighborhood cafe tucked in the middle of Brgy. Buting's heritage district.",
        imageUrl: '/images/treehouse.jpg',
        href: '/merchants',
      },
      {
        id: 'lugawan-sa-tejeros',
        name: 'Lugawan sa Tejeros',
        description:
          'A comforting local stop for warm meals and late-night hangouts with friends.',
        imageUrl: '/images/lugawan-sa-tejeros.jpg',
        href: '/merchants',
      },
      {
        id: 'ikea',
        name: 'IKEA',
        description:
          'A familiar lifestyle destination for affordable finds, snacks, and weekend meetups.',
        imageUrl: '/images/ikea.jpg',
        href: '/merchants',
      },
    ]
  }, [approvedMerchants])

  useEffect(() => {
    if (featuredMerchants.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveFeaturedMerchant((current) =>
        current === featuredMerchants.length - 1 ? 0 : current + 1
      )
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [featuredMerchants.length])

  const featuredMerchant =
    featuredMerchants[activeFeaturedMerchant] || featuredMerchants[0]
  const previousFeaturedMerchant =
    featuredMerchants[
      (activeFeaturedMerchant - 1 + featuredMerchants.length) %
        featuredMerchants.length
    ] || featuredMerchant
  const nextFeaturedMerchant =
    featuredMerchants[
      (activeFeaturedMerchant + 1) % featuredMerchants.length
    ] || featuredMerchant
  const partnerMerchants = approvedMerchants.slice(0, 4)
  const displayName = formatDisplayName(
    profile
      ? [profile.firstName, profile.middleName, profile.lastName]
          .filter(Boolean)
          .join(' ')
      : user?.UserName || 'Youth Member'
  )
  const progressWidth = Math.min(
    100,
    Math.max(12, ((points?.totalPoints || 0) / 3000) * 100)
  )

  return (
    <div className="min-h-screen w-full bg-[#f4f4f4] pb-8 pt-0 text-[#014384]">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#7fb3ec_0%,#b7d3f2_18%,#eef5fd_42%,#fffaf0_68%,#ffffff_100%)] px-5 pb-4 pt-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/35 via-white/10 to-transparent" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#014384] bg-[#e7eef8]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8db3e0] to-[#dce8f7] text-[24px] font-bold text-[#014384]">
                {getInitials(displayName)}
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] font-medium text-[#7486a2]">
                Welcome Back
              </p>
              <h1 className="max-w-[180px] text-[18px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384]">
                {displayName}
              </h1>
              <p className="mt-1 text-[12px] font-medium text-[#9aa8bf]">
                Member since 2026
              </p>
            </div>
          </div>

          <div className="pt-1">
            <Image
              src="/images/FOOTER.png"
              alt="SK Barangay Buting"
              width={132}
              height={34}
              className="h-auto w-[132px] object-contain"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-0">
        <div>
          <p className="text-[13px] font-semibold text-[#0a4e99]">
            Points Balance
          </p>
          <div className="mt-2 h-[10px] overflow-hidden bg-[#f6dfa2]">
            <div
              className="h-full bg-gradient-to-r from-[#fcb315] to-[#d78d00]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#9a9a9a]">
            {pointsLoading ? 'Loading points...' : `${formatPoints(points?.totalPoints || 0)} points`}
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-[#014384]">
              Featured Merchants
            </h2>
          </div>

          <div className="relative overflow-visible py-1">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[38px] left-[-18px] top-[18px] w-[26px] overflow-hidden rounded-l-[22px] rounded-r-[10px] bg-[#dbe7f4] opacity-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#cbdcf0] to-[#edf3f9]" />
              <div className="absolute inset-y-0 right-0 w-[8px] bg-white/35" />
              <div className="absolute inset-y-0 left-0 w-[6px] bg-[#c0d2e8]" />
              <div className="absolute inset-0 shadow-[inset_-8px_0_12px_rgba(255,255,255,0.28)]" />
              <div className="absolute inset-y-[18px] left-[6px] right-[4px] rounded-l-[12px] rounded-r-[8px] bg-[#f2f6fb]/75" />
              <div className="absolute inset-y-[44px] left-[8px] right-[6px] rounded-full bg-[#c9d8ea]/90" />
              <div className="absolute inset-y-[86px] left-[7px] right-[5px] rounded-full bg-[#d8e4f0]/85" />
              <div className="absolute inset-y-[128px] left-[8px] right-[7px] rounded-full bg-[#e4edf6]/82" />
              <div className="absolute inset-y-[168px] left-[7px] right-[6px] rounded-full bg-[#d2dfed]/86" />
              <div className="absolute bottom-0 left-0 right-0 h-[16px] bg-gradient-to-t from-[#d7e3ef] to-transparent" />
              <div className="absolute inset-0 rounded-l-[22px] rounded-r-[10px] border border-white/55" />
              <div className="absolute inset-y-0 right-[-10px] w-[16px] rounded-full bg-white/55 blur-[6px]" />
              <div className="sr-only">
                {previousFeaturedMerchant?.name || 'Previous merchant preview'}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[38px] right-[-18px] top-[18px] w-[26px] overflow-hidden rounded-r-[22px] rounded-l-[10px] bg-[#dbe7f4] opacity-95"
            >
              <div className="absolute inset-0 bg-gradient-to-l from-[#cbdcf0] to-[#edf3f9]" />
              <div className="absolute inset-y-0 left-0 w-[8px] bg-white/35" />
              <div className="absolute inset-y-0 right-0 w-[6px] bg-[#c0d2e8]" />
              <div className="absolute inset-0 shadow-[inset_8px_0_12px_rgba(255,255,255,0.28)]" />
              <div className="absolute inset-y-[18px] left-[4px] right-[6px] rounded-r-[12px] rounded-l-[8px] bg-[#f2f6fb]/75" />
              <div className="absolute inset-y-[44px] left-[6px] right-[8px] rounded-full bg-[#c9d8ea]/90" />
              <div className="absolute inset-y-[86px] left-[5px] right-[7px] rounded-full bg-[#d8e4f0]/85" />
              <div className="absolute inset-y-[128px] left-[7px] right-[8px] rounded-full bg-[#e4edf6]/82" />
              <div className="absolute inset-y-[168px] left-[6px] right-[7px] rounded-full bg-[#d2dfed]/86" />
              <div className="absolute bottom-0 left-0 right-0 h-[16px] bg-gradient-to-t from-[#d7e3ef] to-transparent" />
              <div className="absolute inset-0 rounded-r-[22px] rounded-l-[10px] border border-white/55" />
              <div className="absolute inset-y-0 left-[-10px] w-[16px] rounded-full bg-white/55 blur-[6px]" />
              <div className="sr-only">
                {nextFeaturedMerchant?.name || 'Next merchant preview'}
              </div>
            </div>

            <Link
              href={featuredMerchant?.href || '/merchants'}
              className="relative z-10 block overflow-hidden rounded-[26px] bg-[#f6e2a8] p-3 shadow-[0_10px_24px_rgba(1,67,132,0.08)] transition-transform duration-500 ease-out"
            >
              <div className="relative h-[188px] w-full overflow-hidden rounded-[18px] bg-[#dde6f3]">
                <Image
                  src={featuredMerchant?.imageUrl || '/images/treehouse.jpg'}
                  alt={featuredMerchant?.name || 'Featured merchant'}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="rounded-b-[20px] bg-[#fffaf0] px-4 pb-4 pt-3">
                <h3 className="text-[22px] font-extrabold leading-tight text-[#014384]">
                  {featuredMerchant?.name || 'TreeHouse'}
                </h3>
                <p className="mt-1 text-[12px] leading-[1.45] text-[#3b5d8a]">
                  {featuredMerchant?.description ||
                    "Your neighborhood cafe tucked in the middle of Brgy. Buting's heritage district."}
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-3 flex justify-center gap-1.5">
            {featuredMerchants.map((merchant, index) => (
              <button
                key={merchant.id}
                type="button"
                aria-label={`Show ${merchant.name}`}
                onClick={() => setActiveFeaturedMerchant(index)}
                className={`h-[7px] rounded-full transition-all ${
                  index === activeFeaturedMerchant
                    ? 'w-[28px] rounded-full bg-[#014384]'
                    : 'w-[7px] rounded-full bg-[#8eb0d7]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-[#014384]">
              Partner Shops
            </h2>
            <Link
              href="/merchants"
              className="text-[11px] font-medium text-[#4d78ac]"
            >
              View All Shops
            </Link>
          </div>

          <div className="flex items-center gap-3 overflow-hidden rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(1,67,132,0.06)]">
            {(partnerMerchants.length ? partnerMerchants : mockPartners).map(
              (merchant, index) => {
                const merchantId =
                  'id' in merchant && typeof merchant.id === 'string'
                    ? merchant.id
                    : undefined

                return (
                <Link
                  key={merchantId || merchant.name || index}
                  href={merchantId ? `/merchants/${merchantId}` : '/merchants'}
                  className="flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f6f6f6]"
                >
                  {merchant.imageUrl ? (
                    <Image
                      src={merchant.imageUrl}
                      alt={merchant.name}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-center text-[10px] font-extrabold uppercase leading-tight text-[#014384]">
                      {getInitials(merchant.name)}
                    </span>
                  )}
                </Link>
              )}
            )}

            <Link
              href="/merchants"
              className="ml-auto inline-flex h-9 w-9 flex-shrink-0 items-center justify-center bg-[#edf4fb] text-[#014384]"
              aria-label="See all partner shops"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-[#014384]">
              Promotions
            </h2>
            <div className="flex gap-1.5">
              {promotions.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-2 rounded-full transition-all ${
                    index === activePromo
                      ? 'w-6 rounded-full bg-[#014384]'
                      : 'w-2 rounded-full bg-[#b8cce5]'
                  }`}
                  onClick={() => setActivePromo(index)}
                  aria-label={`Show promotion ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-gradient-to-r from-[#014384] to-[#1f6fc6] p-5 text-white shadow-[0_12px_28px_rgba(1,67,132,0.18)]">
            <p className="text-[20px] font-extrabold leading-tight">
              {promotions[activePromo].title}
            </p>
            <p className="mt-2 max-w-[250px] text-[12px] leading-[1.55] text-white/80">
              {promotions[activePromo].subtitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const mockPartners = [
  { name: 'Jollibee', imageUrl: '' },
  { name: 'Tapa King', imageUrl: '' },
  { name: 'Buting Café', imageUrl: '' },
  { name: 'Yardstick', imageUrl: '' },
]

function formatDisplayName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')
}

function formatPoints(value: number) {
  return new Intl.NumberFormat('en-PH').format(value)
}

function getInitials(value: string) {
  const parts = value.split(' ').filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
