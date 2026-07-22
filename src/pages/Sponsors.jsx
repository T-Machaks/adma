import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sponsor, Exhibitor } from '@/api/entities';
import { Globe, Mail, ExternalLink, Star, Award, MapPin, ChevronRight } from 'lucide-react';
import { SponsorBannerCarousel } from '@/components/SponsorBannerCarousel';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const BASE = EVENT_CONFIG.cdnBase;
const S3   = EVENT_CONFIG.s3Base;
const C    = `${S3}/banners/carousel`;

// Carousel images keyed by sponsor name (normalised) — for DB sponsors that lack carousel_images
const CAROUSEL_MAP = {
  'sany group':              [`${C}/sany-1.jpg`,    `${C}/sany-2.jpg`,    `${C}/sany-3.jpg`],
  'steel warehouse holdings':[`${C}/swh-1.jpg`,     `${C}/swh-2.jpg`,     `${C}/swh-3.jpg`],
  'zimtile':                 [`${C}/zimtile-1.jpg`, `${C}/zimtile-2.jpg`, `${C}/zimtile-3.jpg`],
  'zimplow holdings':        [`${C}/zimplow-1.png`, `${C}/zimplow-2.png`, `${C}/zimplow-3.png`],
};

function injectBanners(list) {
  return list.map(s => ({
    ...s,
    carousel_images: s.carousel_images?.length ? s.carousel_images : (CAROUSEL_MAP[s.name?.toLowerCase()] ?? null),
  }));
}

const TIER_STYLE = {
  Platinum: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-700', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200', dot: 'bg-emerald-400' },
  Gold: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  Silver: { bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  Bronze: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-700' },
};

export default function Sponsors() {
  const { data: dbSponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => Sponsor.list('-created_date'),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list(),
  });

  const sponsors = injectBanners(dbSponsors);
  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  const members = exhibitors.filter(e => e.tier === 'Platinum');

  return (
    <div className="pb-24 max-w-2xl lg:max-w-5xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Sponsors & Members</h1>
      <p className="text-muted-foreground text-sm mb-5">{EVENT_CONFIG.eventFullName} is made possible by the support of our valued sponsors, industry partners, and registered ADMA member companies.</p>

      {/* ADMA Members — Platinum-tier exhibitor companies, visually distinct from sponsors */}
      {members.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-steel text-white flex items-center gap-1.5">
              <Award className="w-3 h-3" /> ADMA Members ({members.length})
            </span>
            <div className="flex-1 h-px bg-steel/40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map(m => (
              <Link
                key={m.id}
                to={`/exhibitors/${m.id}`}
                className="flex items-center gap-3 rounded-xl border-2 border-steel/30 bg-steel/5 dark:bg-steel/10 p-3 hover:border-steel/60 hover:shadow-md active:scale-[0.98] transition-all"
              >
                <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-border shadow-sm">
                  {m.logo_url ? (
                    <img src={m.logo_url} alt={m.name} className="w-9 h-9 object-contain" />
                  ) : (
                    <span className="font-heading text-lg font-bold text-muted-foreground">{m.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <Award className="w-3 h-3 text-steel flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Booth {m.booth} · {m.category}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sponsorship tier legend */}
      <div className="flex gap-2 flex-wrap mb-6">
        {tiers.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${TIER_STYLE[t].dot}`} />
            <span className="text-xs text-muted-foreground font-medium">{t}</span>
          </div>
        ))}
      </div>

      {/* Tier sections */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Loading sponsors…</div>
      ) : sponsors.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sponsor listings coming soon.</p>
        </div>
      ) : tiers.map(tier => {
        const tierSponsors = sponsors.filter(s => s.tier === tier);
        if (tierSponsors.length === 0) return null;
        const style = TIER_STYLE[tier];
        return (
          <div key={tier} className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.badge}`}>{tier} Sponsor{tierSponsors.length > 1 ? 's' : ''}</span>
              <div className={`flex-1 h-px ${style.dot} opacity-40`} />
            </div>
            <div className={`grid ${tier === 'Platinum' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3`}>
              {tierSponsors.map(s => (
                <div key={s.id} className={`rounded-xl border-2 p-4 ${style.bg} ${style.border}`}>
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-border shadow-sm">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="w-12 h-12 object-contain" />
                      ) : (
                        <span className="font-heading text-2xl font-bold text-muted-foreground">{s.name[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="font-heading font-bold text-base leading-tight">{s.name}</p>
                        {s.featured && <Star className="w-3.5 h-3.5 text-amber fill-amber flex-shrink-0 mt-0.5" />}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${style.badge}`}>{s.tier}</span>
                    </div>
                  </div>

                  {tier === 'Platinum' && s.carousel_images?.length > 0 && (
                    <SponsorBannerCarousel
                      images={s.carousel_images}
                      name={s.name}
                      tagline={s.description?.split('.')[0]}
                      booth={s.booth}
                      website={s.website}
                      logoUrl={s.logo_url}
                    />
                  )}

                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{s.description}</p>

                  <div className="flex gap-2">
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs border border-border bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors">
                        <Globe className="w-3 h-3" /> Visit Website
                      </a>
                    )}
                    {s.contact_email && (
                      <a href={`mailto:${s.contact_email}`}
                        className="flex items-center gap-1.5 text-xs border border-border bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors">
                        <Mail className="w-3 h-3" /> Contact
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Become a sponsor CTA */}
      <div className="bg-steel text-white rounded-xl p-5 text-center">
        <p className="font-heading text-lg font-bold tracking-wide mb-2">Become a Sponsor</p>
        <p className="text-sm text-slate-300 mb-4">Partner with {EVENT_CONFIG.eventFullName} to reach decision-makers across Zimbabwe's agricultural sector.</p>
        <a href={EVENT_CONFIG.website} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
          <ExternalLink className="w-4 h-4" /> Enquire at {EVENT_CONFIG.website.replace('https://', '')}
        </a>
      </div>
    </div>
  );
}
