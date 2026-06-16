import { MapPin, Clock, Ticket, Info, ChevronDown, ChevronUp, Phone, Mail, Globe } from 'lucide-react';
import { useState } from 'react';

const FAQS = [
  { q: 'Is registration free for visitors?', a: 'General visitor access is free of charge. Some conference sessions may require pre-registration. Please confirm with the MineCon organising team.' },
  { q: 'Where is MineCon held?', a: 'MineCon 2026 will be held at Artfarm Grounds, Pomona, Harare, Zimbabwe. Ample parking is available on-site.' },
  { q: 'What are the exhibition opening hours?', a: 'The exhibition is open from 08:00 to 18:00 on all three days. Gates open at 07:30 for early access.' },
  { q: 'Can I book meetings with exhibitors in advance?', a: 'Yes. Use the Meetings section in this app to submit a meeting request to any exhibitor. They will confirm your slot.' },
  { q: 'Is there catering available on-site?', a: 'Yes, a catering and refreshment area is available throughout the event. Various food vendors will be on-site.' },
  { q: 'Are children allowed?', a: 'MineCon is a professional B2B exhibition. Children under 16 are not permitted in the exhibition halls unless accompanied by a responsible adult.' },
  { q: 'Is there parking at the venue?', a: 'Yes, dedicated parking is available at Artfarm Grounds. Security personnel will guide visitors. Shuttle services from key pick-up points may be available — check announcements.' },
  { q: 'How do I become an exhibitor?', a: 'Visit minecon.global to complete the exhibitor registration form. Different sponsorship tiers (Diamond, Gold, Chrome, Copper) are available with varying booth sizes and benefits.' },
];

const RULES = [
  'Professional business attire is recommended.',
  'Photography of exhibitor booths requires permission from the exhibitor.',
  'No canvassing or distribution of materials outside your assigned booth.',
  'Vehicles and heavy equipment must be pre-approved for outdoor display zones.',
  'All attendees must wear their visitor or exhibitor badge at all times.',
  'The organisers reserve the right to remove any person behaving in an unsafe or inappropriate manner.',
  'Smoking is only permitted in designated areas.',
];

export default function EventInfo() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-5">Event Information</h1>

      {/* Key details */}
      <div className="bg-steel text-white rounded-xl p-5 mb-5">
        <p className="font-heading text-lg font-bold tracking-wide mb-3 text-amber">MINECON 2026</p>
        <div className="space-y-2">
          <InfoRow icon={Clock} label="Dates" value="TBC — October 2026" />
          <InfoRow icon={Clock} label="Opening Hours" value="08:00 – 18:00 daily (Gates: 07:30)" />
          <InfoRow icon={MapPin} label="Venue" value="Artfarm Grounds, Pomona, Harare, Zimbabwe" />
          <InfoRow icon={Ticket} label="Entry" value="Free for visitors · Exhibitor packages available" />
          <InfoRow icon={Globe} label="Website" value="minecon.global" link="https://minecon.global" />
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">About MineCon</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          MineCon is Southern Africa's dedicated Mining and Construction Exhibition, bringing together suppliers, equipment manufacturers, professional service providers, and industry buyers under one roof.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set on the expansive Artfarm Grounds in Pomona, Harare, MineCon provides a structured B2B environment for serious business conversations, product demonstrations, and contract opportunities across the full spectrum of the mining and construction value chain.
        </p>
      </div>

      {/* Visitor guidance */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Visitor Guidance</h2>
        <div className="space-y-2.5">
          {[
            { icon: '🗺️', text: 'Pick up a printed site map at the registration desk or view it in this app.' },
            { icon: '📱', text: 'Scan QR codes at exhibitor booths to access brochures, product sheets, and demo videos.' },
            { icon: '📅', text: 'Use the Meetings section to book a one-on-one session with any exhibitor.' },
            { icon: '🔔', text: 'Check the Updates section regularly for schedule changes and important notices.' },
            { icon: '🅿️', text: 'Follow signage for parking and shuttle drop-off points at the main gate.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-base flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-muted-foreground leading-snug">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exhibition tiers */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Exhibitor Tiers</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { tier: 'Diamond', color: 'bg-blue-100 text-blue-700', desc: 'Largest floor space, prime location, maximum visibility' },
            { tier: 'Gold', color: 'bg-yellow-100 text-yellow-700', desc: 'Premium placement, branding rights, full booth' },
            { tier: 'Chrome', color: 'bg-slate-100 text-slate-600', desc: 'Standard booth, directory listing, signage' },
            { tier: 'Copper', color: 'bg-orange-100 text-orange-700', desc: 'Compact space, shared zones, entry-level package' },
          ].map(t => (
            <div key={t.tier} className="rounded-lg border border-border p-3">
              <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-1.5 ${t.color}`}>{t.tier}</span>
              <p className="text-xs text-muted-foreground leading-snug">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Event Rules</h2>
        <ul className="space-y-2">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2 items-start text-sm text-muted-foreground">
              <span className="text-amber mt-0.5 flex-shrink-0">▸</span> {r}
            </li>
          ))}
        </ul>
      </div>

      {/* FAQ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Frequently Asked Questions</h2>
        </div>
        {FAQS.map((faq, i) => (
          <div key={i} className="border-b border-border last:border-0">
            <button
              className="w-full px-5 py-4 flex items-start gap-3 text-left hover:bg-muted/40 transition-colors"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <p className="text-sm font-semibold flex-1 leading-snug">{faq.q}</p>
              {openFaq === i ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground mt-0.5" />}
            </button>
            {openFaq === i && (
              <div className="px-5 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Contact the Organisers</h2>
        <div className="space-y-2">
          <a href="https://minecon.global" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-amber hover:underline">
            <Globe className="w-4 h-4" /> minecon.global
          </a>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4" /> info@minecon.global</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> Artfarm Grounds, Pomona, Harare, Zimbabwe</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, link }) {
  return (
    <div className="flex gap-3 items-start">
      <Icon className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="text-sm text-white font-medium hover:text-amber transition-colors">{value}</a>
        ) : (
          <p className="text-sm text-white font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}
