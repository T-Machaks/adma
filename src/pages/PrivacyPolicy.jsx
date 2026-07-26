import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const SECTIONS = [
  {
    title: '1. What this policy covers',
    body: `This policy explains how ADMA Digital (operated by Tyflex Investments / Mediaserv) collects, uses, and protects
personal information for people who use this platform — attendees, exhibitors, and organiser/console staff — whether
you're browsing as a guest, hold a free account, or manage an exhibitor booth.`,
  },
  {
    title: '2. Information we collect',
    body: `Account & registration data: name, email address, phone number, and company, collected when you create an
account, register for the physical show, or apply as an exhibitor.

Exhibitor profile data: company description, logo, gallery images, product/service details, and (for Enhanced/Premium
packages) specialties, certifications, FAQs, and promotional video links.

Engagement analytics: booth visits, QR badge scans, ad clicks, meeting requests, and messages sent through the
platform — used to give exhibitors visibility into attendee interest in their booth.

Technical data: IP address and basic request metadata, collected automatically for security purposes (rate limiting,
abuse prevention, and diagnosing login issues) — see Section 6.`,
  },
  {
    title: '3. How we use your information',
    body: `To operate your account (sign-in, password resets, two-factor authentication), connect attendees and
exhibitors (meeting requests, enquiries, live chat), show you relevant exhibitor/job/tender/auction listings, send
transactional emails and SMS (booking confirmations, verification codes, renewal reminders), and detect and prevent
abuse of the platform (brute-force login attempts, spam).

We do not sell your personal information to third parties.`,
  },
  {
    title: '4. Third parties we share data with',
    body: `Amazon Web Services (AWS) — hosting, database (DynamoDB), and file storage (S3), region af-south-1 (Cape
Town). Microsoft Graph API — sends transactional emails on our behalf. OmniFlex — sends SMS verification codes and
notifications. Google, Microsoft, and Facebook — only if you choose to sign in using one of these providers, in
which case that provider shares your name and email with us per their own privacy terms. CC Sales — pedigree
livestock auction listings link out to their platform; we don't share your data with them unless you follow that
link yourself.`,
  },
  {
    title: '5. Data retention',
    body: `Exhibitor account and profile data: retained for the duration of an active subscription plus 2 years after
expiry, in case of renewal or a dispute.

Attendee/visitor account data: retained while your account is active; accounts inactive for more than 1 year may be
archived or removed.

Security logs (login attempts, password resets, admin actions): retained for a limited operational window sufficient
to investigate abuse, not indefinitely.`,
  },
  {
    title: '6. Security',
    body: `Passwords are never stored in plain text (bcrypt hashing). Organiser/superadmin accounts require two-factor
authentication. Data is encrypted in transit (TLS) and at rest (AWS-managed encryption on our database and file
storage). We log security-relevant events (logins, password resets, account lock/unlock) to help detect and respond
to suspicious activity, and rate-limit authentication endpoints to reduce the risk of automated attacks.`,
  },
  {
    title: '7. Your rights',
    body: `You can ask us to access, correct, or delete your personal data, or ask what data we hold about you, at any
time using the contact details below. Exhibitors can update most of their own profile data directly from the
Exhibitor Portal without needing to contact us.`,
  },
  {
    title: '8. Contact',
    body: `For any privacy question or data request, contact us at ${EVENT_CONFIG.contactEmail}.`,
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-amber" />
          </div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Privacy Policy</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">ADMA Digital — last updated 26 July 2026</p>

        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
          Looking for something else? <Link to="/" className="text-amber hover:underline">Return to ADMA Digital</Link>.
        </p>
      </div>
    </div>
  );
}
