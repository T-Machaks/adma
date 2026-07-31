import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, RateCard } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { BILLING_PERIOD_ORDER, computePrice, isMarketplaceAddonActive } from '@/lib/rateCard';
import UpgradeEnquiryButton from '@/components/exhibitor/UpgradeEnquiryButton';
import {
  DollarSign, CheckCircle, Send, Loader2, Briefcase, ShoppingBag, BookOpen, Layout,
} from 'lucide-react';

const SECTION_ICON = {
  landing_page: Layout,
  virtual_exhibition: Briefcase,
  marketplace: ShoppingBag,
  magazine: BookOpen,
};

export default function ExhibitorRateCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState('monthly');
  const [addonTier, setAddonTier] = useState('text');
  const [addonPeriod, setAddonPeriod] = useState('monthly');

  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors-all'], queryFn: () => Exhibitor.list('-created_date') });
  const { data: rateCard, isLoading } = useQuery({ queryKey: ['rate-card'], queryFn: () => RateCard.get() });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  );

  const requestAddonMutation = useMutation({
    mutationFn: () => Exhibitor.requestMarketplaceAddon(addonTier, addonPeriod),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

  if (isLoading || !rateCard) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">No booth linked to your account.</p>
      </div>
    );
  }

  const addonActive = isMarketplaceAddonActive(myBooth);
  const addonRequested = myBooth.marketplace_addon_status === 'requested';
  const currentPackage = myBooth.package || 'Basic';

  const sectionById = Object.fromEntries(rateCard.sections.map(s => [s.id, s]));
  const packageSection = sectionById.virtual_exhibition;
  const marketplaceSection = sectionById.marketplace;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber" /> Rate Card
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Pricing for packages, marketplace posting, ad slots & magazine placements.</p>
      </div>

      {/* Billing period toggle */}
      <div className="flex flex-wrap gap-2">
        {BILLING_PERIOD_ORDER.map(key => {
          const p = rateCard.billingPeriods[key];
          if (!p) return null;
          return (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-colors ${
                period === key ? 'bg-amber text-white border-amber' : 'border-border text-muted-foreground hover:border-amber/50'
              }`}
            >
              {p.label}
              {p.freeMonths > 0 && <span className="ml-1 opacity-80">· {p.freeMonths} mo free</span>}
            </button>
          );
        })}
      </div>

      {/* Section B: Virtual Exhibition Packages */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-amber" /> {packageSection?.label}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {packageSection?.items.map(item => {
            const isCurrent = item.key === currentPackage;
            return (
              <div key={item.key} className={`rounded-xl border p-4 ${isCurrent ? 'border-amber bg-amber/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <p className="font-heading font-bold text-sm">{item.label}</p>
                  {isCurrent && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber text-white">Current</span>}
                </div>
                <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
              </div>
            );
          })}
        </div>
        {currentPackage !== 'Premium' && (
          <div className="mt-4">
            <UpgradeEnquiryButton
              targetPackage="Premium"
              className="inline-flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150"
            />
          </div>
        )}
      </div>

      {/* Section C: Marketplace Add-On */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber" /> {marketplaceSection?.label}
        </h2>
        {marketplaceSection?.note && <p className="text-xs text-muted-foreground mb-3">{marketplaceSection.note} (Auctions coming soon.)</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {marketplaceSection?.items.map(item => (
            <div key={item.key} className={`rounded-xl border p-4 ${myBooth.marketplace_addon_tier === item.key && (addonActive || addonRequested) ? 'border-amber bg-amber/5' : 'border-border'}`}>
              <p className="font-heading font-bold text-sm">{item.label}</p>
              <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
              <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
            </div>
          ))}
        </div>

        {addonActive ? (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {myBooth.marketplace_addon_tier === 'interactive' ? 'Interactive' : 'Text Only'} add-on active
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jobs, Tenders &amp; Collaborations posting unlocked
                {myBooth.marketplace_addon_expires_at && ` · renews/expires ${new Date(myBooth.marketplace_addon_expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        ) : addonRequested ? (
          <div className="bg-amber/10 border border-amber/20 rounded-xl p-4">
            <p className="text-sm font-semibold">Activation requested</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {myBooth.marketplace_addon_tier === 'interactive' ? 'Interactive' : 'Text Only'} tier, billed {myBooth.marketplace_addon_period || 'monthly'} — awaiting organiser activation once payment is confirmed.
            </p>
          </div>
        ) : (
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium">Request activation</p>
            <div className="flex flex-wrap gap-3">
              <select value={addonTier} onChange={e => setAddonTier(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-border bg-background">
                <option value="text">Text Only</option>
                <option value="interactive">Interactive</option>
              </select>
              <select value={addonPeriod} onChange={e => setAddonPeriod(e.target.value)} className="text-sm px-3 py-2 rounded-lg border border-border bg-background">
                {BILLING_PERIOD_ORDER.map(key => rateCard.billingPeriods[key] && (
                  <option key={key} value={key}>{rateCard.billingPeriods[key].label}</option>
                ))}
              </select>
              <button
                onClick={() => requestAddonMutation.mutate()}
                disabled={requestAddonMutation.isPending}
                className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
              >
                {requestAddonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Request Activation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sections A & D: informational pricing only */}
      {['landing_page', 'magazine'].map(id => {
        const section = sectionById[id];
        if (!section) return null;
        const Icon = SECTION_ICON[id] ?? Layout;
        return (
          <div key={id} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4 text-amber" /> {section.label}
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Organiser-assigned, limited inventory — contact the organiser to book a slot.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {section.items.map(item => (
                <div key={item.key} className="rounded-xl border border-border p-4">
                  <p className="font-heading font-bold text-sm">{item.label}</p>
                  <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                  <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
