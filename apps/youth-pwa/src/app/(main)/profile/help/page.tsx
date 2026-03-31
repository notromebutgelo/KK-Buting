import PageHeader from '@/components/layout/PageHeader'

const faqs = [
  {
    q: 'How do I earn KK Points?',
    a: 'You can earn points by attending KK-sponsored events, scanning QR codes at official events, completing your profile, and participating in KK activities in your community.',
  },
  {
    q: 'How do I redeem my points?',
    a: 'Go to the Rewards section, browse available rewards, and tap "Redeem" on any reward you want. Your points will be deducted and you will receive a redemption code to present to the merchant.',
  },
  {
    q: 'How long does verification take?',
    a: 'Profile verification typically takes 3-5 business days. You will be notified once your profile has been reviewed. Make sure to upload a clear government-issued ID.',
  },
  {
    q: 'What IDs are accepted for verification?',
    a: 'Accepted IDs include: PhilSys (National ID), SSS ID, GSIS ID, Driver\'s License, Passport, Voter\'s ID, PRC ID, and School ID with registration form.',
  },
  {
    q: 'Can I use the app without completing my profile?',
    a: 'You can access basic features, but to earn and redeem points and access your Digital ID, you need to complete your profiling and get verified.',
  },
  {
    q: 'What is the Digital ID?',
    a: 'The Digital ID is your official KK membership card in digital form. It contains a QR code that can be scanned to verify your membership. It is only available after verification.',
  },
  {
    q: 'My account is not verified yet, what should I do?',
    a: 'Check the verification status page for updates. If you have been waiting more than 7 days, contact your local KK/SK office for assistance.',
  },
  {
    q: 'How do I contact support?',
    a: 'For technical issues, reach out to your local SK office. You can also email kk-support@example.gov.ph for assistance.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Help & FAQ" />
      <div className="px-5 pt-4 pb-8 space-y-3">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4">
          <p className="text-green-800 font-semibold text-sm">Need help?</p>
          <p className="text-green-700 text-sm mt-1">
            Contact your local KK/SK office or email us at{' '}
            <a href="mailto:kk-support@example.gov.ph" className="underline font-medium">
              kk-support@example.gov.ph
            </a>
          </p>
        </div>
        {faqs.map((faq, i) => (
          <details key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden group">
            <summary className="px-4 py-3.5 font-semibold text-gray-900 text-sm cursor-pointer list-none flex items-center justify-between">
              {faq.q}
              <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
