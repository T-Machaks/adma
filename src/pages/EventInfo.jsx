import { MapPin, Clock, Ticket, Info, ChevronDown, ChevronUp, Phone, Mail, Globe } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EventInfo as EventInfoEntity } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { useAppSettings } from '@/lib/AppSettingsContext';

export default function EventInfo() {
  const [openFaq, setOpenFaq] = useState(null);
  const { settings } = useAppSettings();
  const { data, isLoading } = useQuery({
    queryKey: ['event-info'],
    queryFn: () => EventInfoEntity.get(),
    staleTime: 60_000,
  });

  if (!settings.showEventInfo) {
    return (
      <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto text-center text-muted-foreground">
        <p className="mt-10">Event Information isn't available right now.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto text-muted-foreground text-sm">Loading…</div>;
  }

  const { dates, hours, venue, entry, aboutParagraphs, visitorGuidance, exhibitorTiers, rules, faqs } = data;

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-5">Event Information</h1>

      {/* Key details + About — side-by-side on desktop */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 mb-5">
        {/* Key details */}
        <div className="bg-steel text-white rounded-xl p-5 mb-5 lg:mb-0">
          <p className="font-heading text-lg font-bold tracking-wide mb-3 text-amber">ADMA AGRI SHOW {EVENT_CONFIG.eventYear}</p>
          <div className="space-y-2">
            <InfoRow icon={Clock} label="Dates" value={dates} />
            <InfoRow icon={Clock} label="Opening Hours" value={hours} />
            <InfoRow icon={MapPin} label="Venue" value={venue} />
            <InfoRow icon={Ticket} label="Entry" value={entry} />
            <InfoRow icon={Globe} label="Website" value={EVENT_CONFIG.website.replace('https://', '')} link={EVENT_CONFIG.website} />
          </div>
        </div>

        {/* About */}
        <div className="bg-card border border-border rounded-xl p-5 mb-5 lg:mb-0">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">About ADMA Agri Show</h2>
          {(aboutParagraphs || []).map((p, i) => (
            <p key={i} className={`text-sm text-muted-foreground leading-relaxed ${i < aboutParagraphs.length - 1 ? 'mb-3' : ''}`}>{p}</p>
          ))}
        </div>
      </div>

      {/* Visitor guidance */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Visitor Guidance</h2>
        <div className="space-y-2.5">
          {(visitorGuidance || []).map((item, i) => (
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
          {(exhibitorTiers || []).map(t => (
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
          {(rules || []).map((r, i) => (
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
        {(faqs || []).map((faq, i) => (
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
          <a href={EVENT_CONFIG.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-amber hover:underline">
            <Globe className="w-4 h-4" /> {EVENT_CONFIG.website.replace('https://', '')}
          </a>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-4 h-4" /> {EVENT_CONFIG.contactEmail}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> {venue}</p>
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
