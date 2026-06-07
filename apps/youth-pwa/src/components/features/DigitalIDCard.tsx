'use client'

import type { UserProfile } from '@/store/userStore'

interface DigitalIDCardProps {
  profile: UserProfile
  qrData?: string
  memberId?: string
  photoUrl?: string | null
  signatureUrl?: string | null
  showBack?: boolean
}

const DIGITAL_ID_TERMS_TEXT =
  'This card is non-transferable and must be used only by the cardholder whose signature appears herein. Cardholder privileges remain subject to implementing guidelines approved by the Sangguniang Kabataan Council.'
const DIGITAL_ID_SIGNATORY_SIGNATURE_SRC = '/images/sk-chairperson-signature.png'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'
const DIGITAL_ID_BARANGAY_LOGO_SRC = '/images/brgy logo.png'
const DIGITAL_ID_SK_LOGO_SRC = '/images/SKButingLogo.png'
export default function DigitalIDCard({
  profile,
  memberId,
  photoUrl,
  signatureUrl,
  showBack = true,
}: DigitalIDCardProps) {
  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  const address = buildAddress(profile)
  const purok = formatFrontCardValue(profile.purok)
  const contactNumber = formatPlainFrontCardValue(profile.contactNumber)
  const emergencyContactName = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactName,
    'Not Provided Yet'
  )
  const emergencyContactPhone = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactPhone,
    'Not Provided Yet'
  )
  const emergencyContactRelationship = formatEmergencyContactValue(
    profile.digitalIdEmergencyContactRelationship,
    'Not Provided Yet'
  )
  const memberSignatureUrl = signatureUrl || profile.digitalIdSignatureUrl || null
  const validThru = getDigitalIdValidThru(
    resolveDigitalIdIssuedAt(
      profile.digitalIdApprovedAt,
      profile.digitalIdGeneratedAt,
      profile.verifiedAt
    )
  )

  return (
    <div className="space-y-4">
      <DigitalIdFace
        backgroundSrc="/images/KK ID - Front BG.png"
        fullName={fullName}
        address={address}
        purok={purok}
        birthday={formatBirthday(profile.birthday)}
        gender={profile.gender || '-'}
        contactNumber={contactNumber}
        photoUrl={photoUrl}
        signatureUrl={memberSignatureUrl}
        memberId={memberId}
        showQr={false}
      />

      {showBack ? (
        <DigitalIdBack
          emergencyContactName={emergencyContactName}
          emergencyContactPhone={emergencyContactPhone}
          emergencyContactRelationship={emergencyContactRelationship}
          validThru={validThru}
        />
      ) : null}
    </div>
  )
}

export function DigitalIdFace({
  backgroundSrc,
  fullName,
  address,
  purok,
  birthday,
  gender,
  contactNumber,
  photoUrl,
  signatureUrl,
  memberId,
  showQr,
  qrCodeUrl,
}: {
  backgroundSrc: string
  fullName: string
  address: string
  purok: string
  birthday: string
  gender: string
  contactNumber: string
  photoUrl?: string | null
  signatureUrl?: string | null
  memberId?: string
  showQr?: boolean
  qrCodeUrl?: string
}) {
  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[26px] [container-type:inline-size] ring-1 ring-[#d7e3f1] shadow-[0_20px_40px_rgba(1,67,132,0.18)]">
      <img
        src={backgroundSrc}
        alt="Digital KK ID front background"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <DigitalIdFrontHeader />
      <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[18.4%] text-[#0b2f5b]">
        <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
          <div className="flex flex-col items-center">
            <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[0.35rem] font-black leading-none tracking-[0.05em] text-[#0b2f5b]">
              {memberId || 'PENDING'}
            </p>
            <div className="mt-[2.3%] flex h-[49%] w-full items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
              {photoUrl ? (
                <img
                  src={getExportSafeImageUrl(photoUrl)}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>
              )}
            </div>
            <div className="mt-[4.6%] flex h-[13%] w-full items-end justify-center overflow-hidden px-[4%]">
              {signatureUrl ? (
                <img
                  src={getExportSafeImageUrl(signatureUrl)}
                  alt="Member signature"
                  className="max-h-full w-full object-contain"
                />
              ) : null}
            </div>
            <div className="w-full border-t border-[#808080] pt-[3.2%] text-center">
              <p className="text-[0.38rem] font-medium tracking-[0.07em] text-[#1a1a1a]">
                SIGNATURE
              </p>
            </div>
          </div>

          <div className="flex h-full justify-between gap-[4%]">
            <div className="min-w-0 flex-1 -translate-y-[3.3%] pt-0">
              <Field label="Name" value={fullName} />
              <Field label="Home Address" value={address} className="mt-[1.8%]" />
              <Field label="Purok" value={purok} className="mt-[1.2%]" />
              <div className="mt-[1.2%] grid grid-cols-2 gap-x-[6%] gap-y-[1.5%]">
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

function DigitalIdFrontHeader() {
  return (
    <div className="absolute inset-x-0 top-0 h-[18.9%] bg-[#014384] text-white">
      <img
        src={DIGITAL_ID_BARANGAY_LOGO_SRC}
        alt="Barangay Buting seal"
        className="absolute left-[4.1%] top-[16%] h-[62%] w-auto rounded-full object-contain"
      />
      <img
        src={DIGITAL_ID_SK_LOGO_SRC}
        alt="Katipunan ng Kabataan Barangay Buting seal"
        className="absolute right-[4.1%] top-[16%] h-[62%] w-auto rounded-full object-contain"
      />
      <div className="absolute inset-x-[13.2%] top-[15%] text-center">
        <p className="whitespace-nowrap font-serif text-[clamp(1rem,4.4cqw,2.05rem)] leading-none tracking-[0.08em]">
          KATIPUNAN NG KABATAAN
        </p>
        <p className="mt-[1.2%] whitespace-nowrap text-[clamp(0.34rem,1.45cqw,0.68rem)] font-semibold uppercase leading-none tracking-[0.12em]">
          Sangguniang Kabataan ng Barangay Buting
        </p>
      </div>
    </div>
  )
}

export function DigitalIdBack({
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelationship,
  validThru,
}: {
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  validThru: string
}) {
  return (
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] [container-type:inline-size] border border-[#d6dee8] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(243,241,235,0.96)_58%,rgba(230,227,219,0.98)_100%)] shadow-[0_10px_24px_rgba(1,67,132,0.08)]">
      <div className="absolute inset-[3.6%] rounded-[18px] border-[1.5px] border-[#4e5650]/65" />
      <div className="absolute inset-[6.2%] rounded-[14px] border border-[#838b85]/35" />
      <div className="relative flex h-full flex-col px-[9%] pb-[10.2%] pt-[9.8%] text-[#2b312e]">
        <div className="text-center">
          <p className="text-[1.24cqw] font-bold uppercase tracking-[0.09em] text-[#666d67]">
            In case of emergency, please contact:
          </p>
          <p className="mt-[2.4%] text-[2.15cqw] font-black leading-[1.08] tracking-[0.01em] text-[#1f2621]">
            {emergencyContactName} - {emergencyContactPhone}
          </p>
          <p className="mt-[1.8%] text-[1.11cqw] font-semibold tracking-[0.08em] text-[#6b726c]">
            Relationship: {emergencyContactRelationship}
          </p>
        </div>

        <div className="mx-auto mt-[5.4%] max-w-[80%] text-center">
          <p className="text-[1.24cqw] font-bold uppercase tracking-[0.18em] text-[#767d78]">
            Terms and Conditions
          </p>
          <p className="mt-[2.4%] text-[1.3cqw] font-semibold leading-[1.32] text-[#424843]">
            {DIGITAL_ID_TERMS_TEXT}
          </p>
        </div>

        <div className="mt-auto flex justify-center pt-[1%]">
          <div className="flex w-full max-w-[68%] flex-col items-center text-center">
            <p className="text-[1.11cqw] font-bold uppercase tracking-[0.16em] text-[#7a807b]">
              Valid Until
            </p>
            <p className="mt-[1.4%] text-[2.08cqw] font-black leading-none text-[#222823]">
              {validThru}
            </p>
            <div className="mt-[1.2%] flex h-[8.8cqw] w-full items-center justify-center overflow-hidden">
              <img
                src={DIGITAL_ID_SIGNATORY_SIGNATURE_SRC}
                alt="Signature of Mark Jervin B. Ventura"
                draggable={false}
                className="block h-full w-auto max-w-[48%] object-contain"
                style={{ transform: 'none' }}
              />
            </div>
            <div className="-mt-[0.4%] h-px w-[58%] bg-[#4d544e]" />
            <p className="mt-[1.4%] text-[1.42cqw] font-black uppercase leading-[1.1] tracking-[0.06em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_NAME}
            </p>
            <p className="mt-[0.8%] text-[1.22cqw] font-black uppercase leading-[1.1] tracking-[0.1em] text-[#303731]">
              {DIGITAL_ID_SIGNATORY_TITLE}
            </p>
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
      <p className="text-[0.38rem] font-bold uppercase tracking-[0.06em] text-[#1d5aa1]">
        {label}:
      </p>
      <p className="break-words text-[0.64rem] font-black leading-[1.15] text-[#0b2f5b]">
        {value || '-'}
      </p>
    </div>
  )
}

function formatBirthday(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-PH')
}

function buildAddress(
  profile: Pick<
    UserProfile,
    | 'currentAddressHouseBlockUnitNumber'
    | 'currentAddressStreetAddress'
    | 'barangay'
    | 'city'
    | 'province'
  >,
) {
  return [
    profile.currentAddressHouseBlockUnitNumber,
    profile.currentAddressStreetAddress,
    profile.barangay,
    profile.city,
    profile.province,
  ]
    .filter(Boolean)
    .join(', ')
    .toUpperCase() || '-'
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

function formatEmergencyContactValue(value: string | undefined, fallback: string) {
  const nextValue = String(value || '').trim()
  if (!nextValue) {
    return fallback
  }

  if (/^\d[\d\s()+-]*$/.test(nextValue)) {
    return nextValue
  }

  return nextValue
    .toLowerCase()
    .split(/\s+/)
    .map((part) =>
      part
        .split('-')
        .map((segment) =>
          segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : ''
        )
        .join('-')
    )
    .join(' ')
}

function formatFrontCardValue(value: string | undefined) {
  const nextValue = String(value || '').trim()
  return nextValue ? nextValue.toUpperCase() : '-'
}

function formatPlainFrontCardValue(value: string | undefined) {
  const nextValue = String(value || '').trim()
  return nextValue || '-'
}

function getDigitalIdValidThru(value?: string) {
  const date = new Date(value || new Date().toISOString())

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  date.setFullYear(date.getFullYear() + 2)

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function resolveDigitalIdIssuedAt(
  ...values: Array<string | null | undefined>
): string | undefined {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) {
      return normalized
    }
  }

  return undefined
}

function getExportSafeImageUrl(value: string) {
  const normalizedUrl = String(value || '').trim()

  if (
    !normalizedUrl ||
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:') ||
    normalizedUrl.startsWith('/')
  ) {
    return normalizedUrl
  }

  if (/^https?:\/\//i.test(normalizedUrl)) {
    try {
      const parsedUrl = new URL(normalizedUrl)

      if (typeof window !== 'undefined' && parsedUrl.origin === window.location.origin) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
      }
    } catch {
      return normalizedUrl
    }

    return `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`
  }

  return normalizedUrl
}
