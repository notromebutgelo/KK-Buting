import PageHeader from '@/components/layout/PageHeader'

export default function TermsPage() {
  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader title="Terms of Service" />
      <div className="px-5 pt-4 pb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-5 text-gray-700">
          <div>
            <h2 className="font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing and using the KK Youth Portal, you accept and agree to be bound by these Terms of Service.
              This platform is operated by the Kabataang Katipunan (KK) organization.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">2. Eligibility</h2>
            <p className="text-sm leading-relaxed">
              The KK Youth Portal is available to Filipino youth between the ages of 15 and 30 years old who are
              registered members or aspiring members of Kabataang Katipunan. You must provide accurate and complete
              information during registration.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">3. User Accounts</h2>
            <p className="text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree to
              notify us immediately of any unauthorized use of your account. KK shall not be liable for any loss
              resulting from unauthorized use of your account.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">4. Points System</h2>
            <p className="text-sm leading-relaxed">
              KK Points are earned through participation in official KK activities and events. Points have no
              monetary value and cannot be transferred, sold, or exchanged for cash. Points may be redeemed for
              rewards offered by participating merchants. KK reserves the right to modify, suspend, or terminate
              the points program at any time.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">5. Privacy</h2>
            <p className="text-sm leading-relaxed">
              We collect personal information as part of the youth profiling process as required by KK regulations.
              Your information will be used for official KK purposes only and will not be shared with third parties
              without your consent, except as required by law.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">6. Conduct</h2>
            <p className="text-sm leading-relaxed">
              Users must conduct themselves in a manner consistent with KK values. Any fraudulent activity,
              misuse of the points system, or violation of these terms may result in account suspension or termination.
            </p>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 mb-2">7. Contact</h2>
            <p className="text-sm leading-relaxed">
              For questions about these terms, please contact your local KK chapter or SK office.
            </p>
          </div>
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Last updated: January 2025. Kabataang Katipunan.
          </p>
        </div>
      </div>
    </div>
  )
}
