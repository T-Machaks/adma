import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, RateCard, Payment, AdSlot } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { BILLING_PERIOD_ORDER, computePrice, isMarketplaceAddonActive } from '@/lib/rateCard';
import UpgradeEnquiryButton from '@/components/exhibitor/UpgradeEnquiryButton';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import {
  DollarSign, CheckCircle, Send, Loader2, Briefcase, ShoppingBag, BookOpen, Layout,
  CreditCard, ArrowRight, Megaphone,
} from 'lucide-react';

export default function ExhibitorRateCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState('monthly');
  const [addonTier, setAddonTier] = useState('text');
  const [addonPeriod, setAddonPeriod] = useState('monthly');
  const [magForm, setMagForm] = useState({ item_key: 'image', company: '', image_url: '', click_url: '' });
  const [magOpen, setMagOpen] = useState(false);

  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors-all'], queryFn: () => Exhibitor.list('-created_date') });
  const { data: rateCard, isLoading } = useQuery({ queryKey: ['rate-card'], queryFn: () => RateCard.get() });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  );

  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list(), enabled: !!myBooth });
  const myAd = myBooth ? (adSlots.find(a => a.exhibitor_id === myBooth.id) ?? null) : null;

  const requestAddonMutation = useMutation({
    mutationFn: () => Exhibitor.requestMarketplaceAddon(addonTier, addonPeriod),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

  // Shared by every "Pay Now" button on this page — creates a pending adma_payments
  // record priced from the server's own rate card, then hands off to Paynow (or, in stub
  // mode, this app's own /payment/stub test-checkout page).
  const payMutation = useMutation({
    mutationFn: (data) => Payment.initiate(data),
    onSuccess: ({ redirectUrl }) => { window.location.href = redirectUrl; },
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

  const packageSection = rateCard.sections.find(s => s.id === 'virtual_exhibition');
  const marketplaceSection = rateCard.sections.find(s => s.id === 'marketplace');
  const magazineSection = rateCard.sections.find(s => s.id === 'magazine');

  const renderPriceCard = (item, extraClass = '') => (
    <div key={item.key} className={`rounded-xl border p-4 ${extraClass || 'border-border'}`}>
      <p className="font-heading font-bold text-sm">{item.label}</p>
      <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
      <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
      {item.desc && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{item.desc}</p>}
    </div>
  );

  const adSlotPendingPayment = myAd?.review_status === 'requested';
  const magazineItem = magazineSection?.items.find(i => i.key === magForm.item_key);
  const magazinePrice = magazineItem ? computePrice(magazineItem.monthlyRate, period, rateCard.billingPeriods) : null;

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

      {/* Section A: Landing Page — Banner Carousel is self-service (pay to request);
          Video Carousel / Strip Footer Banner remain organiser-assigned only. */}
      {rateCard.sections.filter(s => s.id === 'landing_page').map(section => (
        <div key={section.id} className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
            <Layout className="w-4 h-4 text-amber" /> {section.label}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Video Carousel &amp; Strip Footer Banner are organiser-assigned, limited inventory — contact the organiser to book a slot.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {section.items.map(item => {
              if (item.key !== 'carousel') return renderPriceCard(item);
              return (
                <div key={item.key} className="rounded-xl border border-border p-4">
                  <p className="font-heading font-bold text-sm">{item.label}</p>
                  <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                  <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
                  <Link
                    to="/exhibitor"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-amber font-semibold hover:underline"
                  >
                    <Megaphone className="w-3 h-3" /> {myAd ? 'Manage & Pay for Ad' : 'Set Up & Pay for Ad'} <ArrowRight className="w-3 h-3" />
                  </Link>
                  {adSlotPendingPayment && <p className="text-[11px] text-amber mt-1">Awaiting organiser review.</p>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
                {item.desc && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{item.desc}</p>}
                {!isCurrent && (
                  <button
                    onClick={() => payMutation.mutate({ type: 'package', item_key: item.key, period })}
                    disabled={payMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 mt-3 text-xs bg-amber text-white font-semibold px-3 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {payMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />} Pay &amp; Upgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {currentPackage !== 'Premium' && (
          <div className="mt-4">
            <UpgradeEnquiryButton
              targetPackage="Premium"
              className="inline-flex items-center gap-1.5 text-sm border border-border font-semibold px-5 py-2.5 rounded-xl hover:bg-muted active:scale-95 transition-all duration-150"
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
          {marketplaceSection?.items.map(item => renderPriceCard(
            item,
            myBooth.marketplace_addon_tier === item.key && (addonActive || addonRequested) ? 'border-amber bg-amber/5' : undefined
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
            <p className="text-sm font-medium">Activate the Marketplace Add-on</p>
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
                onClick={() => payMutation.mutate({ type: 'marketplace_addon', item_key: addonTier, period: addonPeriod })}
                disabled={payMutation.isPending}
                className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
              >
                {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Pay &amp; Activate
              </button>
              <button
                onClick={() => requestAddonMutation.mutate()}
                disabled={requestAddonMutation.isPending}
                className="flex items-center gap-1.5 text-sm border border-border font-medium px-4 py-2 rounded-lg hover:bg-muted active:scale-95 transition-all disabled:opacity-60"
              >
                {requestAddonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Request (pay another way)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section D: Digital Magazine — pay to request a placement; the organiser builds
          it into an actual magazine page afterward. */}
      {magazineSection && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber" /> {magazineSection.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {magazineSection.items.map(item => renderPriceCard(item))}
          </div>

          {!magOpen ? (
            <button
              onClick={() => { setMagForm(f => ({ ...f, company: f.company || myBooth.name })); setMagOpen(true); }}
              className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" /> Request a Placement
            </button>
          ) : (
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Placement Type</label>
                <select
                  value={magForm.item_key}
                  onChange={e => setMagForm(f => ({ ...f, item_key: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background"
                >
                  {magazineSection.items.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Company Name</label>
                <input
                  type="text"
                  value={magForm.company}
                  onChange={e => setMagForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
              </div>
              <ImageUploadOrUrlField
                label="Ad Image"
                value={magForm.image_url}
                onChange={v => setMagForm(f => ({ ...f, image_url: v }))}
                ownerId={myBooth.id}
                purpose="magazine_request"
                preset="flexible"
              />
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Destination URL <span className="text-muted-foreground/70">(optional)</span></label>
                <input
                  type="url"
                  value={magForm.click_url}
                  placeholder="https://company.com"
                  onChange={e => setMagForm(f => ({ ...f, click_url: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">The organiser will place this into an actual magazine page after payment — they may follow up for additional assets (e.g. carousel slides, video) depending on the placement type.</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => payMutation.mutate({
                    type: 'magazine_request',
                    item_key: magForm.item_key,
                    period,
                    request_payload: { company: magForm.company, image_url: magForm.image_url, click_url: magForm.click_url },
                  })}
                  disabled={payMutation.isPending || !magForm.company || !magForm.image_url}
                  className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
                >
                  {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Pay ${magazinePrice ?? '—'} &amp; Submit Request
                </button>
                <button
                  onClick={() => setMagOpen(false)}
                  className="text-sm font-medium border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
