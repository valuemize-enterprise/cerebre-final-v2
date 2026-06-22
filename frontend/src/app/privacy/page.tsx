import { BRAND } from '@/lib/brand';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ background:'#060320' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background:'linear-gradient(135deg,#6d28d9,#a78bfa)' }}>S</div>
          <div><p className="text-white font-black">{BRAND.name}</p><p className="text-purple-400 text-xs">{BRAND.agency}</p></div>
        </div>
        <h1 className="text-4xl font-black text-white mb-3">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: January 2026</p>
        <div className="space-y-8 text-white/65 text-sm leading-relaxed">
          {[
            { h:'1. Information we collect', p:`We collect information you provide directly (name, email, job title), information generated through your use of the Platform (login times, feature usage, uploaded reports), and data you connect from third-party platforms (social media metrics, analytics data) only with your explicit authorisation.` },
            { h:'2. How we use your information', p:`Your information is used to provide and improve the Service, generate intelligence reports and insights, send you relevant communications (weekly digests, alerts), and ensure the security of the Platform. We do not sell your personal data to third parties.` },
            { h:'3. Data storage and security', p:`All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use Supabase (PostgreSQL) and Upstash (Redis) for data storage, both of which comply with industry-standard security practices. API credentials and sensitive data are encrypted using additional key management.` },
            { h:'4. Third-party integrations', p:`When you connect a social media or analytics platform, we access only the data you authorise and only for as long as the connection is active. We do not store raw access tokens in plain text. You may disconnect any integration at any time from the Connect Platforms page.` },
            { h:'5. Your rights', p:`Under Nigerian data protection regulations (NDPR) and applicable law, you have the right to access, correct, or delete your personal data; withdraw consent for data processing; and receive a copy of your data in a portable format. To exercise these rights, contact privacy@cerebre.africa.` },
            { h:'6. Data retention', p:`Personal data is retained for as long as your account is active or as needed to provide the Service. Upon account deletion, personal data is removed within 30 days, except where retention is required by law.` },
            { h:'7. Changes to this policy', p:`We may update this Privacy Policy periodically. We will notify you of significant changes via email or a prominent notice on the Platform. Continued use after changes constitutes acceptance.` },
            { h:'8. Contact', p:`Privacy questions: privacy@cerebre.africa · Cerebre Media Africa Limited, Lagos, Nigeria.` },
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
