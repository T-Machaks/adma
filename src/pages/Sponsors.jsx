import { useQuery } from '@tanstack/react-query';
import { Sponsor } from '@/api/entities';
import { Globe, Mail, ExternalLink, Star } from 'lucide-react';

const BASE = 'https://minecon.global/wp-content/uploads/2025';
const DEMO_SPONSORS = [
  { id: 'd1', name: 'SANY Group',              tier: 'Platinum', description: 'Global leader in construction and mining equipment. Proud Platinum sponsor of MineCon 2026.',         website: 'https://www.sanyglobal.com',    logo_url: `${BASE}/08/SANY.png`,               featured: true  },
  { id: 'd2', name: 'Zimplow Holdings',         tier: 'Platinum', description: 'Diversified Zimbabwean industrial group supporting mining and construction across Southern Africa.',   website: 'http://www.zimplow.co.zw',     logo_url: `${BASE}/08/ZINMPLOW.png`,           featured: true  },
  { id: 'd3', name: 'Steel Warehouse Holdings', tier: 'Platinum', description: 'Zimbabwe\'s leading steel and metal products supplier to the mining and construction sector.',         website: 'http://www.swh.co.zw',         logo_url: `${BASE}/08/STEEL-WAREHOUSE.png`,    featured: true  },
  { id: 'd4', name: 'Agricon Equipment',        tier: 'Gold',     description: 'Comprehensive equipment solutions for mining, earthmoving and construction across Zimbabwe.',          website: 'http://www.agriconequipment.net', logo_url: `${BASE}/08/AGRICON.png`,          featured: false },
  { id: 'd5', name: 'LiuGong Zimbabwe',         tier: 'Gold',     description: 'Official LiuGong heavy equipment distributor for Zimbabwe and the wider region.',                     website: 'http://www.liugongzw.com',     logo_url: `${BASE}/09/LIUGONG.png`,            featured: false },
  { id: 'd6', name: 'Kanu Equipment',           tier: 'Gold',     description: 'Construction and mining equipment dealer with full aftersales support across Zimbabwe.',              website: '',                             logo_url: `${BASE}/08/KANU-EQUIPMENT.png`,     featured: false },
  { id: 'd7', name: 'R&S Diesel Professionals', tier: 'Silver',   description: 'Specialist diesel engine service and parts supply for heavy plant and mining fleet.',                 website: '',                             logo_url: `${BASE}/08/RS-DIESEL.png`,          featured: false },
  { id: 'd8', name: 'Electrosales Zimbabwe',    tier: 'Silver',   description: 'Electrical systems, lighting, and power solutions for mining and industrial operations.',             website: '',                             logo_url: `${BASE}/09/ELECTROSALES.png`,       featured: false },
  { id: 'd9', name: 'Scout Aerial Africa',      tier: 'Bronze',   description: 'Drone surveys, aerial photography, and LiDAR mapping for mining exploration and site monitoring.',   website: 'https://scoutaerialafrica.com', logo_url: `${BASE}/08/SCOUT-AERIAL.png`,      featured: false },
  { id: 'd10', name: 'EcoCash',                 tier: 'Bronze',   description: 'Zimbabwe\'s leading mobile money platform powering cashless transactions at the exhibition.',         website: '',                             logo_url: `${BASE}/09/ECOCASH.png`,            featured: false },
];

const TIER_STYLE = {
  Platinum: { bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200', dot: 'bg-slate-400' },
  Gold: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-300 dark:border-yellow-800', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  Silver: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  Bronze: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
};

export default function Sponsors() {
  const { data: dbSponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => Sponsor.list('-created_date'),
  });

  const sponsors = dbSponsors.length > 0 ? dbSponsors : DEMO_SPONSORS;
  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Sponsors & Partners</h1>
      <p className="text-muted-foreground text-sm mb-5">MineCon 2026 is made possible by the support of our valued sponsors and industry partners.</p>

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
      {tiers.map(tier => {
        const tierSponsors = sponsors.filter(s => s.tier === tier);
        if (tierSponsors.length === 0) return null;
        const style = TIER_STYLE[tier];
        return (
          <div key={tier} className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${style.badge}`}>{tier} Sponsor{tierSponsors.length > 1 ? 's' : ''}</span>
              <div className={`flex-1 h-px ${style.dot} opacity-40`} />
            </div>
            <div className={`grid ${tier === 'Platinum' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
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

                  {tier === 'Platinum' && (
                    <div className="w-full h-16 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center mb-3 border border-dashed border-slate-400">
                      <p className="text-xs text-muted-foreground font-medium">Banner Ad Space — {s.name}</p>
                    </div>
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
        <p className="text-sm text-slate-300 mb-4">Partner with MineCon 2026 to reach decision-makers across the mining and construction sector in Southern Africa.</p>
        <a href="https://minecon.global" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
          <ExternalLink className="w-4 h-4" /> Enquire at minecon.global
        </a>
      </div>
    </div>
  );
}
