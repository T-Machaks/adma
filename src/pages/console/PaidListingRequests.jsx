import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdSlot, Payment } from '@/api/entities';
import { CheckCircle, Clock, Loader2, XCircle, Megaphone, BookOpen } from 'lucide-react';

function RequestCard({ icon: Icon, title, subtitle, meta, onActivate, onDecline, busy, activateLabel = 'Activate' }) {
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
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} {activateLabel}
        </button>
      </div>
    </div>
  );
}

export default function PaidListingRequests() {
  const qc = useQueryClient();

  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list('-created_date') });
  const { data: payments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => Payment.list() });

  const pendingAdSlots = adSlots.filter(a => a.review_status === 'requested');
  // Package/add-on/ad-slot payments resolve themselves automatically once confirmed
  // (server/routes/payments.js's completePayment dispatcher) — only magazine requests
  // have no existing entity to review, so they're the only payment item type that needs
  // a manual organiser follow-up here. A checkout can bundle several items together, so
  // this flattens across every paid record down to just the unfulfilled magazine lines.
  const pendingMagazine = payments
    .filter(p => p.status === 'paid')
    .flatMap(p => (p.items || [])
      .filter(i => i.type === 'magazine_request' && !i.fulfilled)
      .map(i => ({ ...i, paymentId: p.id, exhibitor_name: p.exhibitor_name })));

  const fulfillMagazine = useMutation({
    mutationFn: ({ paymentId, itemId }) => Payment.fulfill(paymentId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
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

  const totalPending = pendingAdSlots.length + pendingMagazine.length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber" />
          Paid Listing Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Review ad slots and magazine placements once payment has been confirmed.</p>
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

          {pendingMagazine.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Magazine Placement Requests (Paid)</p>
              <div className="space-y-2">
                {pendingMagazine.map(i => (
                  <RequestCard
                    key={i.id}
                    icon={BookOpen}
                    title={i.exhibitor_name}
                    subtitle={`${i.item_label} — $${Number(i.amount).toLocaleString()} paid, billed ${i.period}`}
                    meta={i.request_payload?.click_url ? `Destination: ${i.request_payload.click_url}` : undefined}
                    activateLabel="Mark Fulfilled"
                    busy={fulfillMagazine.isPending}
                    onActivate={() => fulfillMagazine.mutate({ paymentId: i.paymentId, itemId: i.id })}
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
