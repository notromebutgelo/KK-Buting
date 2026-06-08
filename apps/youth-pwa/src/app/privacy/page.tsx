import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | KKB App Buting',
  description: 'Privacy policy for the KKB App Buting youth portal.',
}

const sections = [
  {
    title: 'Information We Collect',
    body: [
      'We collect account details such as your name, email address, contact number, and login information.',
      'We collect youth profiling details that may include your address, purok, date of birth, gender, educational background, work status, civil status, and related KK profiling information.',
      'We may collect verification files, profile photos, signatures, digital ID information, reward activity, voucher activity, merchant scans, and support or request records submitted through the app.',
    ],
  },
  {
    title: 'How We Use Information',
    body: [
      'We use your information to create and manage your KK Buting account, verify youth membership, process profiling records, generate digital IDs, manage points and rewards, and support SK Barangay Buting services.',
      'We may use contact details to send verification updates, account notices, reward notices, and service-related messages.',
      'We use app activity and technical information to secure accounts, prevent misuse, maintain records, improve the service, and comply with lawful requirements.',
    ],
  },
  {
    title: 'Sharing of Information',
    body: [
      'Authorized SK Barangay Buting administrators may access records needed to review, verify, and manage youth membership and services.',
      'We may share limited information with service providers that help operate authentication, hosting, storage, messaging, analytics, or related app infrastructure.',
      'We do not sell personal information. We may disclose information when required by law, public authority, or to protect the safety, security, and integrity of the service.',
    ],
  },
  {
    title: 'Data Security and Retention',
    body: [
      'We use reasonable technical and administrative safeguards to protect personal information from unauthorized access, loss, misuse, or alteration.',
      'Records are retained for as long as needed for KK profiling, verification, digital ID, rewards, administrative, legal, or accountability purposes.',
      'No online system is completely risk-free, so users should keep their login credentials secure and report suspicious account activity promptly.',
    ],
  },
  {
    title: 'Your Choices and Rights',
    body: [
      'You may review and update certain account details in the app. Some official KK profiling records may require administrator review before changes are accepted.',
      'You may contact us to request assistance with access, correction, deletion, or other privacy concerns, subject to applicable laws and official record requirements.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f4f8fc] text-[#12324f]">
      <section className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/images/SKButingLogo.png"
            alt="Sangguniang Kabataan Barangay Buting seal"
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
            priority
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0d5aa7]">
              KKB App Buting
            </p>
            <h1 className="text-2xl font-extrabold text-[#014384] sm:text-3xl">
              Privacy Policy
            </h1>
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_40px_rgba(1,67,132,0.08)] sm:px-8 sm:py-8">
          <p className="text-sm leading-7 text-[#4f6680]">
            This Privacy Policy explains how Sangguniang Kabataan Barangay Buting collects,
            uses, stores, and protects information through the KKB App Buting youth portal.
          </p>

          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-extrabold text-[#014384]">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-[#4f6680]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-extrabold text-[#014384]">Contact Us</h2>
            <p className="mt-3 text-sm leading-7 text-[#4f6680]">
              For privacy questions or requests, contact the project support team at{' '}
              <a className="font-bold text-[#0d5aa7]" href="mailto:info.skrollup@gmail.com">
                info.skrollup@gmail.com
              </a>
              .
            </p>
          </section>

          <div className="border-t border-[#dbe8f6] pt-5 text-xs leading-6 text-[#7188a3]">
            <p>Last updated: June 8, 2026.</p>
            <p>
              You can also review the app terms at{' '}
              <Link className="font-bold text-[#0d5aa7]" href="/terms">
                kkbapp-buting.com/terms
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
