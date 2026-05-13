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
const DIGITAL_ID_SIGNATURE_TEXT = 'Mark Jervin B. Ventura'
const DIGITAL_ID_SIGNATORY_NAME = 'HON. MARK JERVIN B. VENTURA'
const DIGITAL_ID_SIGNATORY_TITLE = 'SK CHAIRPERSON'

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

  const address = [profile.barangay, profile.city, profile.province]
    .filter(Boolean)
    .join(', ')
    .toUpperCase()
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
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[26px] ring-1 ring-[#d7e3f1] shadow-[0_20px_40px_rgba(1,67,132,0.18)]">
      <img
        src={backgroundSrc}
        alt="Digital KK ID front background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative flex h-full flex-col px-[8.2%] pb-[10.5%] pt-[18.4%] text-[#0b2f5b]">
        <div className="grid h-full grid-cols-[27%_1fr] gap-[6.5%]">
          <div className="flex flex-col items-center">
            <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[0.35rem] font-black leading-none tracking-[0.05em] text-[#0b2f5b]">
              {memberId || 'PENDING'}
            </p>
            <div className="mt-[2.3%] flex h-[49%] w-full items-center justify-center overflow-hidden border border-[#2c5a8f] bg-[#eef4fb]">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-black text-[#014384]">{getInitials(fullName)}</span>
              )}
            </div>
            <div className="mt-[4.6%] flex h-[13%] w-full items-end justify-center overflow-hidden px-[4%]">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
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
    <div className="relative aspect-[1.58/1] overflow-hidden rounded-[24px] border border-[#d6dee8] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(243,241,235,0.96)_58%,rgba(230,227,219,0.98)_100%)] shadow-[0_10px_24px_rgba(1,67,132,0.08)]">
      <div className="absolute inset-[3.6%] rounded-[18px] border-[1.5px] border-[#4e5650]/65" />
      <div className="absolute inset-[6.2%] rounded-[14px] border border-[#838b85]/35" />
      <div className="relative flex h-full flex-col px-[9%] pb-[20.8%] pt-[9.8%] text-[#2b312e] sm:px-[8.9%] sm:pb-[21.4%] sm:pt-[10.4%]">
        <div className="text-center">
          <p className="text-[0.38rem] font-bold uppercase tracking-[0.09em] text-[#666d67] sm:text-[0.42rem]">
            In case of emergency, please contact:
          </p>
          <p className="mt-[2.4%] text-[0.66rem] font-black leading-[1.08] tracking-[0.01em] text-[#1f2621] sm:mt-[2.6%] sm:text-[0.74rem] sm:leading-[1.05]">
            {emergencyContactName} - {emergencyContactPhone}
          </p>
          <p className="mt-[1.8%] text-[0.34rem] font-semibold tracking-[0.08em] text-[#6b726c] sm:mt-[2.2%] sm:text-[0.38rem]">
            Relationship: {emergencyContactRelationship}
          </p>
        </div>

        <div className="mx-auto mt-[5.4%] max-w-[80%] text-center">
          <p className="text-[0.38rem] font-bold uppercase tracking-[0.18em] text-[#767d78] sm:text-[0.42rem]">
            Terms and Conditions
          </p>
          <p className="mt-[2.4%] text-[0.4rem] font-semibold leading-[1.32] text-[#424843] sm:mt-[3%] sm:text-[0.46rem] sm:leading-[1.38]">
            {DIGITAL_ID_TERMS_TEXT}
          </p>
        </div>

        <div className="mt-auto flex justify-center pt-[0.8%] sm:pt-[1.1%]">
          <div className="flex w-full max-w-[62%] flex-col items-center text-center sm:max-w-[61%]">
            <p className="text-[0.34rem] font-bold uppercase tracking-[0.16em] text-[#7a807b] sm:text-[0.36rem]">
              Valid Until
            </p>
            <p className="mt-[1.4%] text-[0.64rem] font-black text-[#222823] sm:mt-[1.8%] sm:text-[0.72rem]">
              {validThru}
            </p>
            <p className="mt-[2.6%] text-[0.7rem] font-semibold italic tracking-[0.02em] text-[#444b45] sm:mt-[3.5%] sm:text-[0.82rem]">
              {DIGITAL_ID_SIGNATURE_TEXT}
            </p>
            <div className="mt-[1%] h-px w-[60%] bg-[#4d544e] sm:mt-[1.2%] sm:w-[58%]" />
            <p className="mt-[1.2%] text-[0.3rem] font-black uppercase leading-none tracking-[0.08em] text-[#303731] sm:mt-[1.5%] sm:text-[0.34rem]">
              {DIGITAL_ID_SIGNATORY_NAME}
            </p>
            <p className="mt-[0.6%] text-[0.29rem] font-black uppercase leading-none tracking-[0.12em] text-[#303731] sm:mt-[0.8%] sm:text-[0.33rem]">
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
