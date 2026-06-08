import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | KKB App Buting',
  description: 'Terms of service for the KKB App Buting youth portal.',
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By accessing or using KKB App Buting, you agree to these Terms of Service. The platform supports youth profiling, verification, digital ID services, points, rewards, vouchers, and related services for Sangguniang Kabataan Barangay Buting.',
  },
  {
    title: '2. Eligibility',
    body:
      'The app is intended for eligible youth members or applicants connected with Barangay Buting and the Katipunan ng Kabataan program. You must provide accurate, complete, and current information during registration, profiling, and verification.',
  },
  {
    title: '3. Account Responsibility',
    body:
      'You are responsible for keeping your account credentials secure and for all activity under your account. You must notify the project support team or SK Barangay Buting if you believe your account has been accessed without permission.',
  },
  {
    title: '4. Profiling and Verification',
    body:
      'Information, documents, photos, signatures, and other records submitted through the app may be reviewed by authorized administrators. Verification approval, rejection, and record updates are subject to SK Barangay Buting review and applicable program requirements.',
  },
  {
    title: '5. Digital ID',
    body:
      'Digital IDs generated through the app are provided for official KK Buting identification and service access purposes. Users must not alter, misuse, forge, share, or present another person\'s digital ID as their own.',
  },
  {
    title: '6. Points, Rewards, and Vouchers',
    body:
      'Points, rewards, vouchers, merchant benefits, and related offers are subject to availability, eligibility rules, expiration dates, merchant participation, and administrator review. Points have no cash value and may not be sold, transferred, or exchanged for money.',
  },
  {
    title: '7. Acceptable Use',
    body:
      'You agree not to misuse the app, submit false information, attempt unauthorized access, disrupt the service, exploit rewards, or use the platform in a way that violates laws, community standards, or official SK Barangay Buting policies.',
  },
  {
    title: '8. Service Changes',
    body:
      'SK Barangay Buting may update, suspend, remove, or change app features, records, verification flows, rewards, vouchers, or policies as needed for operations, safety, compliance, or service improvement.',
  },
  {
    title: '9. Privacy',
    body:
      'Use of personal information is described in the Privacy Policy. By using the app, you acknowledge that your information may be collected, processed, and stored for official KK Buting services and related administrative purposes.',
  },
  {
    title: '10. Contact',
    body:
      'For questions about these terms, account access, or app support, contact the project support team at info.skrollup@gmail.com or coordinate with SK Barangay Buting.',
  },
]

export default function TermsOfServicePage() {
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
              Terms of Service
            </h1>
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_40px_rgba(1,67,132,0.08)] sm:px-8 sm:py-8">
          <p className="text-sm leading-7 text-[#4f6680]">
            These Terms of Service explain the rules for using KKB App Buting and related
            youth services provided for Sangguniang Kabataan Barangay Buting.
          </p>

          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-extrabold text-[#014384]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#4f6680]">{section.body}</p>
            </section>
          ))}

          <div className="border-t border-[#dbe8f6] pt-5 text-xs leading-6 text-[#7188a3]">
            <p>Last updated: June 8, 2026.</p>
            <p>
              You can also review the privacy policy at{' '}
              <Link className="font-bold text-[#0d5aa7]" href="/privacy">
                kkbapp-buting.com/privacy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
