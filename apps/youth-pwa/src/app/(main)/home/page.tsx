'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { useMerchants } from '@/hooks/useMerchants'
import { useUser } from '@/hooks/useUser'
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
  href: string
}

interface PromotionHighlight {
  id: string
  title: string
  subtitle: string
  href: string
}

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
        href: `/merchants/${merchant.id}`,
      })),
    [approvedMerchants]
  )

  const promotionHighlights = useMemo<PromotionHighlight[]>(
    () =>
      approvedMerchants
        .flatMap((merchant) =>
          (merchant.promotions || []).map((promotion) => ({
            id: `${merchant.id}-${promotion.id}`,
            title: promotion.title,
            subtitle:
              promotion.shortTagline ||
              promotion.valueLabel ||
              merchant.shortDescription ||
              merchant.description ||
              '',
            href: `/merchants/${merchant.id}`,
          }))
        )
        .filter((promotion) => promotion.title)
        .slice(0, 6),
    [approvedMerchants]
  )

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

  useEffect(() => {
    setActiveFeaturedMerchant((current) =>
      current >= featuredMerchants.length ? 0 : current
    )
  }, [featuredMerchants.length])

  useEffect(() => {
    setActivePromo((current) =>
      current >= promotionHighlights.length ? 0 : current
    )
  }, [promotionHighlights.length])

  const featuredMerchant =
    featuredMerchants[activeFeaturedMerchant] || featuredMerchants[0] || null
  const partnerMerchants = approvedMerchants.slice(0, 4)
  const activePromotion =
    promotionHighlights[activePromo] || promotionHighlights[0] || null

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

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.5px] border-[#014384] bg-[#e7eef8]">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#8db3e0] to-[#dce8f7] text-[24px] font-bold text-[#014384]">
                {getInitials(displayName)}
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-2">
              <p className="text-[11px] font-medium text-[#7486a2]">Welcome Back</p>
              <h1 className="pr-1 text-[18px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384] [overflow-wrap:anywhere]">
                {displayName}
              </h1>
              <p className="mt-1 text-[12px] font-medium text-[#9aa8bf]">
                Member since 2026
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            <Image
              src="/images/FOOTER.png"
              alt="SK Barangay Buting"
              width={132}
              height={34}
              className="h-auto w-[86px] object-contain sm:w-[132px]"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-0">
        <div>
          <p className="text-[13px] font-semibold text-[#0a4e99]">Points Balance</p>
          <div className="mt-2 h-[10px] overflow-hidden bg-[#f6dfa2]">
            <div
              className="h-full bg-gradient-to-r from-[#fcb315] to-[#d78d00]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <p className="mt-1 text-[12px] font-medium text-[#9a9a9a]">
            {pointsLoading
              ? 'Loading points...'
              : `${formatPoints(points?.totalPoints || 0)} points`}
          </p>
        </div>

        <SectionHeader title="Featured Merchants" />
        {merchantsLoading ? (
          <StateCard
            title="Loading merchants..."
            copy="Fetching approved merchant storefronts from the server."
          />
        ) : featuredMerchant ? (
          <div className="mt-3">
            <Link
              href={featuredMerchant.href}
              className="block overflow-hidden rounded-[26px] bg-[#f6e2a8] p-3 shadow-[0_10px_24px_rgba(1,67,132,0.08)]"
            >
              <div className="relative h-[188px] w-full overflow-hidden rounded-[18px] bg-[#dde6f3]">
                {featuredMerchant.imageUrl ? (
                  <Image
                    src={featuredMerchant.imageUrl}
                    alt={featuredMerchant.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#d6e7f7_0%,#8db3e0_100%)]" />
                )}
              </div>
              <div className="rounded-b-[20px] bg-[#fffaf0] px-4 pb-4 pt-3">
                <h3 className="text-[22px] font-extrabold leading-tight text-[#014384]">
                  {featuredMerchant.name}
                </h3>
                <p className="mt-1 text-[12px] leading-[1.45] text-[#3b5d8a]">
                  {featuredMerchant.description || 'This merchant has not added a storefront description yet.'}
                </p>
              </div>
            </Link>

            {featuredMerchants.length > 1 ? (
              <div className="mt-3 flex justify-center gap-1.5">
                {featuredMerchants.map((merchant, index) => (
                  <button
                    key={merchant.id}
                    type="button"
                    aria-label={`Show ${merchant.name}`}
                    onClick={() => setActiveFeaturedMerchant(index)}
                    className={`h-[7px] rounded-full transition-all ${
                      index === activeFeaturedMerchant
                        ? 'w-[28px] bg-[#014384]'
                        : 'w-[7px] bg-[#8eb0d7]'
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

        <SectionHeader title="Partner Shops" action={{ href: '/merchants', label: 'View All Shops' }} />
        {partnerMerchants.length > 0 ? (
          <div className="mt-3 flex items-center gap-3 overflow-hidden rounded-[24px] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(1,67,132,0.06)]">
            {partnerMerchants.map((merchant, index) => (
              <Link
                key={merchant.id || merchant.name || index}
                href={`/merchants/${merchant.id}`}
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
            ))}

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
        ) : (
          <StateCard
            title="No partner shops yet"
            copy="Merchant partners will show up here once approved storefronts are live."
          />
        )}

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-[#014384]">Promotions</h2>
            {promotionHighlights.length > 1 ? (
              <div className="flex gap-1.5">
                {promotionHighlights.map((promotion, index) => (
                  <button
                    key={promotion.id}
                    type="button"
                    className={`h-2 rounded-full transition-all ${
                      index === activePromo
                        ? 'w-6 bg-[#014384]'
                        : 'w-2 bg-[#b8cce5]'
                    }`}
                    onClick={() => setActivePromo(index)}
                    aria-label={`Show promotion ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {activePromotion ? (
            <Link
              href={activePromotion.href}
              className="block rounded-[24px] bg-gradient-to-r from-[#014384] to-[#1f6fc6] p-5 text-white shadow-[0_12px_28px_rgba(1,67,132,0.18)]"
            >
              <p className="text-[20px] font-extrabold leading-tight">
                {activePromotion.title}
              </p>
              <p className="mt-2 max-w-[250px] text-[12px] leading-[1.55] text-white/80">
                {activePromotion.subtitle || 'Open the merchant page to view the full promotion details.'}
              </p>
            </Link>
          ) : (
            <StateCard
              title="No promotions yet"
              copy="Merchant promotions will appear here once partner shops publish active offers."
            />
          )}
        </div>
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
      <h2 className="text-[15px] font-extrabold text-[#014384]">{title}</h2>
      {action ? (
        <Link href={action.href} className="text-[11px] font-medium text-[#4d78ac]">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

function StateCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="mt-3 rounded-[24px] bg-white px-5 py-8 text-center shadow-[0_10px_24px_rgba(1,67,132,0.06)]">
      <p className="text-[16px] font-extrabold text-[#014384]">{title}</p>
      <p className="mt-2 text-[12px] leading-[1.5] text-[#6a86a4]">{copy}</p>
    </div>
  )
}

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
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
