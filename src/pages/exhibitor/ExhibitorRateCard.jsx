import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Exhibitor, RateCard, Payment, AdSlot } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { BILLING_PERIOD_ORDER, computePrice, isMarketplaceAddonActive } from '@/lib/rateCard';
import UpgradeEnquiryButton from '@/components/exhibitor/UpgradeEnquiryButton';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import FileUploadOrUrlField from '@/components/shared/FileUploadOrUrlField';
import {
  DollarSign, CheckCircle, Send, Loader2, Briefcase, ShoppingBag, BookOpen, Layout,
  ShoppingCart, Plus, X, ArrowRight, CreditCard, Landmark,
} from 'lucide-react';

const AD_PLACEMENTS = [
  { key: 'carousel', title: 'Banner Carousel' },
  { key: 'video-carousel', title: 'Video Carousel' },
  { key: 'footer-strip', title: 'Strip Footer Banner' },
];

// Types that can only ever have one line in the cart at a time — adding one replaces
// whatever was previously selected for that type.
const SINGLETON_TYPES = ['package', 'marketplace_addon', 'magazine_request'];

export default function ExhibitorRateCard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [cart, setCart] = useState([]); // client-side only until checkout
  const [magForm, setMagForm] = useState({ item_key: 'image', company: '', image_url: '', click_url: '' });
  const [magOpen, setMagOpen] = useState(false);
  const [checkout, setCheckout] = useState(null); // null | 'eft-uploading' | 'eft-submitted'
  const [eftPaymentId, setEftPaymentId] = useState(null);
  const [popPreviewUrl, setPopPreviewUrl] = useState('');

  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors-all'], queryFn: () => Exhibitor.list('-created_date') });
  const { data: rateCard, isLoading } = useQuery({ queryKey: ['rate-card'], queryFn: () => RateCard.get() });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  );

  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list(), enabled: !!myBooth });
  const myAds = Object.fromEntries(AD_PLACEMENTS.map(({ key }) => [
    key, myBooth ? (adSlots.find(a => a.exhibitor_id === myBooth.id && a.placement === key) ?? null) : null,
  ]));

  // Every "Pay via Paynow" checkout — sends the whole cart, redirects to Paynow (or the
  // /payment/stub test page in stub mode) for one combined transaction.
  const payMutation = useMutation({
    mutationFn: () => Payment.initiate(cart.map(toServerItem)),
    onSuccess: ({ redirectUrl }) => { window.location.href = redirectUrl; },
  });

  // "I paid via EFT" — same cart, no Paynow call; lands pending organiser verification
  // once a proof-of-payment is attached.
  const eftInitiateMutation = useMutation({
    mutationFn: () => Payment.initiateEft(cart.map(toServerItem)),
    onSuccess: ({ paymentId }) => { setEftPaymentId(paymentId); setCheckout('eft-uploading'); },
  });

  const attachPopMutation = useMutation({
    mutationFn: (popUrl) => Payment.attachPop(eftPaymentId, popUrl),
    onSuccess: () => { setCheckout('eft-submitted'); setCart([]); },
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

  function toServerItem(cartItem) {
    const { type, item_key, period, ad_slot_id, request_payload } = cartItem;
    return { type, item_key, period, ad_slot_id, request_payload };
  }

  const addonActive = isMarketplaceAddonActive(myBooth);
  const currentPackage = myBooth.package || 'Basic';

  const packageSection = rateCard.sections.find(s => s.id === 'virtual_exhibition');
  const marketplaceSection = rateCard.sections.find(s => s.id === 'marketplace');
  const landingSection = rateCard.sections.find(s => s.id === 'landing_page');
  const magazineSection = rateCard.sections.find(s => s.id === 'magazine');

  const inCart = (type, matchKey) => cart.find(c => c.type === type && (matchKey === undefined || c.item_key === matchKey || c.ad_slot_id === matchKey));

  const addToCart = (entry) => {
    setCart(prev => {
      const withoutConflicts = SINGLETON_TYPES.includes(entry.type)
        ? prev.filter(c => c.type !== entry.type)
        : prev.filter(c => !(c.type === entry.type && c.ad_slot_id === entry.ad_slot_id));
      return [...withoutConflicts, { localId: `${entry.type}-${entry.item_key}-${entry.ad_slot_id || ''}-${Date.now()}`, ...entry }];
    });
  };
  const removeFromCart = (localId) => setCart(prev => prev.filter(c => c.localId !== localId));

  const cartTotal = cart.reduce((sum, c) => sum + c.amount, 0);

  const renderPriceCard = (item, extraClass = '') => (
    <div key={item.key} className={`rounded-xl border p-4 ${extraClass || 'border-border'}`}>
      <p className="font-heading font-bold text-sm">{item.label}</p>
      <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
      <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
      {item.desc && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{item.desc}</p>}
    </div>
  );

  const magazineItem = magazineSection?.items.find(i => i.key === magForm.item_key);
  const magazinePrice = magazineItem ? computePrice(magazineItem.monthlyRate, period, rateCard.billingPeriods) : null;

  const startCheckout = (method) => {
    setCheckout(method);
    if (method === 'paynow') payMutation.mutate();
    else eftInitiateMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-32">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber" /> Rate Card
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Add anything you need to your cart and pay for it all in one checkout.</p>
      </div>

      {/* Billing period toggle — applies to every item in the cart */}
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

      {/* Section A: Landing Page — all three placements are self-service; each is
          addable to cart once a saved-but-unpaid ad exists for that placement. */}
      {landingSection && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
            <Layout className="w-4 h-4 text-amber" /> {landingSection.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {landingSection.items.map(item => {
              const placement = AD_PLACEMENTS.find(p => p.key === item.key);
              const slot = placement ? myAds[placement.key] : null;
              const readyToPay = slot && slot.review_status !== 'requested' && (slot.pending_changes || slot.active === false);
              const awaitingReview = slot?.review_status === 'requested';
              const already = inCart('adslot_request', slot?.id);
              return (
                <div key={item.key} className={`rounded-xl border p-4 ${already ? 'border-amber bg-amber/5' : 'border-border'}`}>
                  <p className="font-heading font-bold text-sm">{item.label}</p>
                  <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                  <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
                  {readyToPay ? (
                    <button
                      onClick={() => already
                        ? removeFromCart(already.localId)
                        : addToCart({ type: 'adslot_request', item_key: item.key, item_label: item.label, period, ad_slot_id: slot.id, amount: computePrice(item.monthlyRate, period, rateCard.billingPeriods) })}
                      className={`w-full flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                        already ? 'bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20' : 'bg-amber text-white hover:bg-amber/90'
                      }`}
                    >
                      {already ? <><X className="w-3.5 h-3.5" /> Remove</> : <><Plus className="w-3.5 h-3.5" /> Add to Cart</>}
                    </button>
                  ) : awaitingReview ? (
                    <p className="text-[11px] text-amber mt-2">Awaiting organiser review.</p>
                  ) : (
                    <Link to="/exhibitor" className="inline-flex items-center gap-1 mt-2 text-xs text-amber font-semibold hover:underline">
                      Create this ad on My Booth first <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section B: Virtual Exhibition Packages */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-amber" /> {packageSection?.label}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {packageSection?.items.map(item => {
            const isCurrent = item.key === currentPackage;
            const already = inCart('package', item.key);
            return (
              <div key={item.key} className={`rounded-xl border p-4 ${isCurrent ? 'border-amber bg-amber/5' : already ? 'border-amber bg-amber/5' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <p className="font-heading font-bold text-sm">{item.label}</p>
                  {isCurrent && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber text-white">Current</span>}
                </div>
                <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
                {item.desc && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{item.desc}</p>}
                {!isCurrent && (
                  <button
                    onClick={() => already
                      ? removeFromCart(already.localId)
                      : addToCart({ type: 'package', item_key: item.key, item_label: item.label, period, amount: computePrice(item.monthlyRate, period, rateCard.billingPeriods) })}
                    className={`w-full flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                      already ? 'bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20' : 'bg-amber text-white hover:bg-amber/90'
                    }`}
                  >
                    {already ? <><X className="w-3.5 h-3.5" /> Remove</> : <><Plus className="w-3.5 h-3.5" /> Add to Cart</>}
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

        {addonActive && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-3">
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
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {marketplaceSection?.items.map(item => {
            const isCurrentActive = addonActive && myBooth.marketplace_addon_tier === item.key;
            const already = inCart('marketplace_addon', item.key);
            return (
              <div key={item.key} className={`rounded-xl border p-4 ${isCurrentActive || already ? 'border-amber bg-amber/5' : 'border-border'}`}>
                <p className="font-heading font-bold text-sm">{item.label}</p>
                <p className="font-heading text-2xl font-bold mt-2">${computePrice(item.monthlyRate, period, rateCard.billingPeriods)}</p>
                <p className="text-[11px] text-muted-foreground">per {rateCard.billingPeriods[period]?.label.toLowerCase()}</p>
                {!isCurrentActive && (
                  <button
                    onClick={() => already
                      ? removeFromCart(already.localId)
                      : addToCart({ type: 'marketplace_addon', item_key: item.key, item_label: item.label, period, amount: computePrice(item.monthlyRate, period, rateCard.billingPeriods) })}
                    className={`w-full flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
                      already ? 'bg-amber/10 text-amber border border-amber/30 hover:bg-amber/20' : 'bg-amber text-white hover:bg-amber/90'
                    }`}
                  >
                    {already ? <><X className="w-3.5 h-3.5" /> Remove</> : <><Plus className="w-3.5 h-3.5" /> Add to Cart</>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
              <Send className="w-4 h-4" /> {inCart('magazine_request') ? 'Edit Request' : 'Request a Placement'}
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
                  onClick={() => {
                    addToCart({
                      type: 'magazine_request', item_key: magForm.item_key, item_label: magazineItem?.label || magForm.item_key, period,
                      amount: magazinePrice ?? 0,
                      request_payload: { company: magForm.company, image_url: magForm.image_url, click_url: magForm.click_url },
                    });
                    setMagOpen(false);
                  }}
                  disabled={!magForm.company || !magForm.image_url}
                  className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" /> Add to Cart — ${magazinePrice ?? '—'}
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

      {/* Cart / checkout bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            {checkout === 'eft-submitted' ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-semibold">Submitted — awaiting organiser verification. You'll get a confirmation email once it's approved.</p>
              </div>
            ) : checkout === 'eft-uploading' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Upload your proof of payment (bank transfer receipt)</p>
                <FileUploadOrUrlField
                  value={popPreviewUrl}
                  onChange={url => { setPopPreviewUrl(url); if (url) attachPopMutation.mutate(url); }}
                  uploadEndpoint="/api/upload/payment-pop-url"
                  accept="application/pdf,image/*"
                  previewKind="document"
                  helperText="PDF or image, up to 25MB."
                />
                {attachPopMutation.isPending && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting…</p>}
                <button onClick={() => setCheckout(null)} className="text-xs font-medium text-muted-foreground hover:underline">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                    <ShoppingCart className="w-3.5 h-3.5" /> Cart ({cart.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cart.map(c => (
                      <span key={c.localId} className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-full pl-3 pr-1.5 py-1">
                        {c.item_label} · ${c.amount}
                        <button onClick={() => removeFromCart(c.localId)} className="w-4 h-4 rounded-full hover:bg-background flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="font-heading text-lg font-bold">${cartTotal}</p>
                  <button
                    onClick={() => startCheckout('eft')}
                    disabled={eftInitiateMutation.isPending}
                    className="flex items-center gap-1.5 text-sm border border-border font-semibold px-4 py-2.5 rounded-xl hover:bg-muted active:scale-95 transition-all disabled:opacity-60"
                  >
                    <Landmark className="w-4 h-4" /> I paid via EFT
                  </button>
                  <button
                    onClick={() => startCheckout('paynow')}
                    disabled={payMutation.isPending}
                    className="flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Pay via Paynow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
