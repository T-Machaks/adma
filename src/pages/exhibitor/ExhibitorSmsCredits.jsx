import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Payment, SmsCredits } from '@/api/entities';
import { MessageSquare, Loader2, CreditCard, ExternalLink, Receipt, AlertCircle } from 'lucide-react';

const BUNDLES = [
  { key: 'SMS500', credits: 500, blurb: '≈ 500 text messages' },
  { key: 'SMS1000', credits: 1000, blurb: '≈ 1,000 text messages' },
];

export default function ExhibitorSmsCredits() {
  const [buyingKey, setBuyingKey] = useState(null);
  const [openError, setOpenError] = useState('');

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['sms-credits-summary'],
    queryFn: () => SmsCredits.summary(),
  });

  const buyMutation = useMutation({
    mutationFn: (itemKey) => Payment.initiate([{ type: 'sms_bundle', item_key: itemKey, period: 'once' }]),
    onMutate: (itemKey) => { setBuyingKey(itemKey); },
    onSuccess: ({ redirectUrl }) => { window.location.href = redirectUrl; },
    onError: () => { setBuyingKey(null); },
  });

  const openMutation = useMutation({
    mutationFn: () => SmsCredits.open(),
    onMutate: () => setOpenError(''),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e) => setOpenError(e.message || 'Could not open your SMS dashboard.'),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">{error.message || 'No booth linked to your account.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber" /> Bulk Messaging / SMS Credits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Buy an SMS credit bundle to reach your leads directly — sent from your own OmniFlex workspace.
          </p>
        </div>
        <Link to="/exhibitor/billing" className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors">
          <Receipt className="w-3.5 h-3.5" /> Payment History
        </Link>
      </div>

      {summary?.hasWorkspace && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-heading font-bold text-sm">Your SMS workspace is ready</p>
              <p className="text-xs text-muted-foreground mt-1">Send messages, manage contacts, and check your credit balance in OmniFlex.</p>
            </div>
            <button
              onClick={() => openMutation.mutate()}
              disabled={openMutation.isPending}
              className="flex items-center justify-center gap-1.5 text-sm bg-amber text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60 flex-shrink-0"
            >
              {openMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Open My SMS Dashboard
            </button>
          </div>
          {openError && <p className="text-xs text-red-600 mt-3">{openError}</p>}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-1">Buy Credits</h2>
        {!summary?.hasWorkspace && (
          <p className="text-xs text-muted-foreground mb-3">Buy a bundle to activate your SMS workspace.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {BUNDLES.map(b => {
            const price = summary?.prices?.[b.key];
            const isBuying = buyingKey === b.key && buyMutation.isPending;
            return (
              <div key={b.key} className="rounded-xl border border-border p-4">
                <p className="font-heading font-bold text-sm">{b.credits.toLocaleString()} Credits</p>
                <p className="font-heading text-2xl font-bold mt-2">{price != null ? `$${price.toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground">{b.blurb}</p>
                <button
                  onClick={() => buyMutation.mutate(b.key)}
                  disabled={buyMutation.isPending || price == null}
                  className="w-full flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-amber text-white hover:bg-amber/90 transition-all disabled:opacity-60"
                >
                  {isBuying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />} Buy
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
