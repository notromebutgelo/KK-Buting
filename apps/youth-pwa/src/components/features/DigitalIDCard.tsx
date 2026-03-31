'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { UserProfile } from '@/store/userStore'

interface DigitalIDCardProps {
  profile: UserProfile
  qrData?: string
  memberId?: string
  photoUrl?: string | null
}

export default function DigitalIDCard({
  profile,
  qrData,
  memberId,
  photoUrl,
}: DigitalIDCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    let active = true

    async function renderQr() {
      if (!qrData) {
        setQrCodeUrl('')
        return
      }

      try {
        const nextQr = await QRCode.toDataURL(qrData, {
          width: 220,
          margin: 1,
          color: {
            dark: '#0b2f5b',
            light: '#FFFFFF',
          },
        })
        if (active) setQrCodeUrl(nextQr)
      } catch {
        if (active) setQrCodeUrl('')
      }
    }

    renderQr()
    return () => {
      active = false
    }
  }, [qrData])

  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  const address = [profile.barangay, profile.city, profile.province]
    .filter(Boolean)
    .join(', ')
    .toUpperCase()

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#7fb3ec_0%,#c8def6_20%,#f7fbff_48%,#fff7eb_76%,#f4f4f4_100%)] px-5 pb-6 pt-5 shadow-[0_20px_40px_rgba(1,67,132,0.18)]">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-[88px] bg-[radial-gradient(circle_at_top_right,rgba(252,186,44,0.95),rgba(252,186,44,0.15)_60%,transparent_72%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full border-[4px] border-[#1e8ef7] bg-white shadow-md">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[26px] font-black text-[#014384]">
                  {getInitials(fullName)}
                </span>
              )}
            </div>

            <div className="pt-3">
              <p className="text-[11px] font-medium text-[#8ea0b8]">Welcome Back</p>
              <h2 className="max-w-[190px] text-[17px] font-extrabold uppercase leading-[1.02] tracking-[0.01em] text-[#014384]">
                {fullName}
              </h2>
              <p className="mt-1 text-[12px] font-semibold text-[#38a169]">
                Verified, Member since {extractYear(profile.verifiedAt)}
              </p>
            </div>
          </div>

          <div className="pt-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#014384]">
              Sangguniang Kabataan
            </p>
            <p className="text-[11px] font-black text-[#014384]">Barangay Buting</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[22px] font-black text-[#014384]">Your Digital ID</p>
        </div>

        <div className="mt-4 space-y-5">
          <DigitalIdFace
            backgroundSrc="/images/KK ID - Front BG.png"
            fullName={fullName}
            address={address}
            birthday={formatBirthday(profile.birthday)}
            gender={profile.gender || '-'}
            contactNumber={profile.contactNumber || '-'}
            photoUrl={photoUrl}
            memberId={memberId}
            showQr={false}
          />

          <DigitalIdBack
            backgroundSrc="/images/KK ID - Back BG.png"
            qrCodeUrl={qrCodeUrl}
          />
        </div>
      </div>
    </div>
  )
}

export function DigitalIdFace({
  backgroundSrc,
  fullName,
  address,
  birthday,
  gender,
  contactNumber,
  photoUrl,
  memberId,
  showQr,
  qrCodeUrl,
}: {
  backgroundSrc: string
  fullName: string
  address: string
  birthday: string
  gender: string
  contactNumber: string
  photoUrl?: string | null
  memberId?: string
  showQr?: boolean
  qrCodeUrl?: string
}) {
  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] shadow-[0_16px_28px_rgba(1,67,132,0.22)]">
      <img src={backgroundSrc} alt="Digital KK ID front background" className="absolute inset-0 h-full w-full object-cover" />

      <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[20.2%] text-[#0b2f5b]">
        <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
          <div className="flex flex-col">
            <div className="flex h-[58%] items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>
              )}
            </div>
            <div className="mt-[5%] border-t border-[#808080] pt-[3.5%] text-center">
              <p className="text-[0.38rem] font-medium tracking-[0.07em] text-[#1a1a1a]">SIGNATURE</p>
            </div>
            <p className="mt-[4%] break-all text-[0.4rem] font-bold leading-tight text-[#0b2f5b]">{memberId || 'PENDING'}</p>
          </div>

          <div className="flex h-full justify-between gap-[4%]">
            <div className="min-w-0 flex-1 pt-0">
              <Field label="Name" value={fullName} />
              <Field label="Home Address" value={address} className="mt-[3%]" />
              <div className="mt-[2.4%] grid grid-cols-2 gap-x-[6%] gap-y-[2.2%]">
                <Field label="Date of Birth" value={birthday} />
                <Field label="Gender" value={gender.toUpperCase()} />
                <Field label="Contact No" value={contactNumber} />
              </div>
            </div>

            {showQr ? (
              <div className="mt-auto w-[30%]">
                <div className="rounded-[10px] bg-white/90 p-[5%] shadow-md">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR code" className="h-auto w-full" />
                  ) : (
                    <div className="aspect-square w-full rounded-[8px] bg-[#eef5fd]" />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DigitalIdBack({
  backgroundSrc,
  qrCodeUrl,
}: {
  backgroundSrc: string
  qrCodeUrl?: string
}) {
  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] shadow-[0_16px_28px_rgba(1,67,132,0.22)]">
      <img src={backgroundSrc} alt="Digital KK ID back background" className="absolute inset-0 h-full w-full object-cover" />

      <div className="relative grid h-full grid-cols-[41%_1fr] gap-[6.5%] px-[8%] pb-[9.5%] pt-[24.8%] text-[#0b2f5b]">
        <div className="flex flex-col justify-start">
          <p className="text-[0.44rem] font-bold leading-[1.3] text-[#20456f]">
            IN CASE OF EMERGENCY, PLEASE CONTACT:
          </p>
          <p className="mt-[2%] text-[0.7rem] font-black uppercase leading-tight text-[#0b2f5b]">
            SHARRAINE KIZH V. CUETO
          </p>
          <p className="mt-[5%] text-[0.49rem] font-bold uppercase leading-[1.3] text-[#1d5aa1]">
            Emergency Contact No:
          </p>
          <p className="mt-[1%] text-[0.7rem] font-black text-[#0b2f5b]">
            09220422042
          </p>
          <p className="mt-[6%] max-w-[94%] text-[0.52rem] italic leading-[1.4] text-[#4c6d95]">
            If found, please return to the Barangay Hall of Barangay Buting, Pasig City.
          </p>
        </div>

        <div className="flex items-start justify-center pl-[3%] pt-0">
          <div className="w-full max-w-[134px] rounded-[14px] bg-white/96 p-[5.5%] shadow-md">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR code" className="h-auto w-full" />
            ) : (
              <div className="aspect-square w-full rounded-[10px] bg-[#eef5fd]" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-[0.38rem] font-bold uppercase tracking-[0.06em] text-[#1d5aa1]">{label}:</p>
      <p className="break-words text-[0.64rem] font-black leading-[1.15] text-[#0b2f5b]">{value || '-'}</p>
    </div>
  )
}

function formatBirthday(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH')
}

function extractYear(value?: string) {
  if (!value) return new Date().getFullYear()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().getFullYear()
  return date.getFullYear()
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}
