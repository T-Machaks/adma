import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, AdSlot, RateCard } from '@/api/entities';
import { CheckCircle, Clock, ShoppingBag, Loader2, XCircle, Megaphone } from 'lucide-react';

function RequestCard({ icon: Icon, title, subtitle, meta, onActivate, onDecline, busy }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {onDecline && (
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex items-center gap-1 text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" /> Decline
          </button>
        )}
        <button
          onClick={onActivate}
          disabled={busy}
          className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Activate
        </button>
      </div>
    </div>
  );
}

// Adds a billing period's total months (period.months, already net of any free months —
// the free months are a discount on price, not on how long the period covers) to now.
function computeExpiryISO(periodKey, billingPeriods) {
  const months = billingPeriods?.[periodKey]?.months ?? 1;
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export default function PaidListingRequests() {
  const qc = useQueryClient();

  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors-all'], queryFn: () => Exhibitor.list('-created_date') });
  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list('-created_date') });
  const { data: rateCard } = useQuery({ queryKey: ['rate-card'], queryFn: () => RateCard.get() });

  const pendingAddons = exhibitors.filter(e => e.marketplace_addon_status === 'requested');
  const pendingAdSlots = adSlots.filter(a => a.review_status === 'requested');

  const activateAddon = useMutation({
    mutationFn: (ex) => Exhibitor.update(ex.id, {
      marketplace_addon_status: 'active',
      marketplace_addon_billed_at: new Date().toISOString(),
      marketplace_addon_expires_at: computeExpiryISO(ex.marketplace_addon_period, rateCard?.billingPeriods),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });
  const declineAddon = useMutation({
    mutationFn: (id) => Exhibitor.update(id, { marketplace_addon_status: 'none' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exhibitors-all'] }),
  });

  const activateAdSlot = useMutation({
    mutationFn: (slot) => AdSlot.update(slot.id, slot.pending_changes
      ? { ...slot.pending_changes, pending_changes: null, review_status: null }
      : { active: true, review_status: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adslots'] });
      qc.invalidateQueries({ queryKey: ['adslots-active'] });
    },
  });
  const declineAdSlot = useMutation({
    mutationFn: (id) => AdSlot.update(id, { pending_changes: null, review_status: 'declined' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adslots'] });
      qc.invalidateQueries({ queryKey: ['adslots-active'] });
    },
  });

  const totalPending = pendingAddons.length + pendingAdSlots.length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber" />
          Paid Listing Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Activate ad slots and the Marketplace Add-on once payment has been confirmed.</p>
      </div>

      {totalPending === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No paid listing requests pending.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingAdSlots.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Ad Slots — New/Edit Review</p>
              <div className="space-y-2">
                {pendingAdSlots.map(a => (
                  <RequestCard
                    key={a.id}
                    icon={Megaphone}
                    title={a.company}
                    subtitle={a.pending_changes ? (a.pending_changes.headline || a.headline) : a.headline}
                    meta={a.pending_changes ? 'Edit to an existing live ad' : 'New ad slot'}
                    busy={activateAdSlot.isPending || declineAdSlot.isPending}
                    onActivate={() => activateAdSlot.mutate(a)}
                    onDecline={() => declineAdSlot.mutate(a.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pendingAddons.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Marketplace Add-on Requests</p>
              <div className="space-y-2">
                {pendingAddons.map(ex => (
                  <RequestCard
                    key={ex.id}
                    icon={ShoppingBag}
                    title={ex.name}
                    subtitle={`${ex.marketplace_addon_tier === 'interactive' ? 'Interactive' : 'Text Only'} — unlocks Jobs, Tenders & Collaborations`}
                    meta={`Billing: ${ex.marketplace_addon_period || 'monthly'}`}
                    busy={activateAddon.isPending || declineAddon.isPending}
                    onActivate={() => activateAddon.mutate(ex)}
                    onDecline={() => declineAddon.mutate(ex.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
