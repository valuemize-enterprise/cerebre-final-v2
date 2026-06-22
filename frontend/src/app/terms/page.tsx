import { BRAND } from '@/lib/brand';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ background:'#060320' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
          <div><p className="text-white font-black">{BRAND.name}</p><p className="text-purple-400 text-xs">{BRAND.agency}</p></div>
        </div>
        <h1 className="text-4xl font-black text-white mb-3">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 2026</p>
        <div className="prose prose-invert max-w-none space-y-8 text-white/65 text-sm leading-relaxed">
          {[
            { h:'1. Acceptance of terms', p:`By accessing and using ${BRAND.name} ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users, including agency staff, client portal users, and administrators.` },
            { h:'2. Description of service', p:`${BRAND.name} is a marketing intelligence platform provided by ${BRAND.agency}. The Platform provides AI-powered analytics, reporting, and intelligence tools for African businesses. Access is granted on a subscription or client-agreement basis only.` },
            { h:'3. Account access and security', p:`You are responsible for maintaining the confidentiality of your login credentials. You must notify ${BRAND.agency} immediately of any unauthorised access. You may not share your credentials or allow others to access your account. ${BRAND.agency} reserves the right to suspend accounts showing signs of unauthorised use.` },
            { h:'4. Data and privacy', p:`Your use of the Platform is also governed by our Privacy Policy. Data you upload, including reports and analytics, remains your property. By uploading data, you grant ${BRAND.agency} a limited licence to process it for the purpose of providing the Service.` },
            { h:'5. Prohibited uses', p:`You may not use the Platform to upload unlawful content, reverse-engineer the Service, resell access without authorisation, or circumvent security measures. Violations may result in immediate account suspension.` },
            { h:'6. Intellectual property', p:`All Platform content, features, and functionality — including ClarityScore™, NarrativeAI™, VelocityTracker™, DepthView™, and the ARIA engine — are owned by ${BRAND.agency} and are protected by intellectual property laws. You may not copy, modify, or distribute these without written consent.` },
            { h:'7. Limitation of liability', p:`${BRAND.agency} provides the Platform "as is" without warranties of any kind. To the maximum extent permitted by law, ${BRAND.agency} shall not be liable for indirect, incidental, or consequential damages arising from your use of the Platform.` },
            { h:'8. Governing law', p:`These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.` },
            { h:'9. Contact', p:`For questions about these Terms, contact legal@cerebre.africa or write to Cerebre Media Africa Limited, Lagos, Nigeria.` },
          ].map(({ h, p }) => (
            <div key={h}>
              <h2 className="text-lg font-black text-white mb-2">{h}</h2>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
