import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Payment } from '@/api/entities';
import { DollarSign, Loader2, FileText, CheckCircle, XCircle, Landmark } from 'lucide-react';

const STATUS_STYLES = {
  paid:                 'bg-emerald-100 text-emerald-700',
  pending:              'bg-amber-100 text-amber-700',
  pending_verification: 'bg-amber-100 text-amber-700',
  cancelled:            'bg-red-100 text-red-700',
  rejected:             'bg-red-100 text-red-700',
};

function itemsSummary(payment) {
  return (payment.items || []).map(i => i.item_label).join(', ');
}

export default function PaymentsLedger() {
  const qc = useQueryClient();
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => Payment.list() });

  const verifyMutation = useMutation({
    mutationFn: (id) => Payment.verifyEft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id) => Payment.rejectEft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });

  const pendingEft = payments.filter(p => p.status === 'pending_verification');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-amber" />
          Payments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Every payment attempt across packages, marketplace add-ons, ad slots & magazine placements.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : (
        <>
          {pendingEft.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" /> Awaiting EFT Verification
              </p>
              <div className="space-y-2">
                {pendingEft.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Landmark className="w-4 h-4 text-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.exhibitor_name} — ${Number(p.amount).toLocaleString()} {p.currency}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{itemsSummary(p)}</p>
                      {p.pop_url ? (
                        <a href={p.pop_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber font-medium hover:underline mt-1.5">
                          <FileText className="w-3.5 h-3.5" /> View proof of payment
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-1.5">No proof uploaded yet.</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => rejectMutation.mutate(p.id)}
                        disabled={verifyMutation.isPending || rejectMutation.isPending}
                        className="flex items-center gap-1 text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => verifyMutation.mutate(p.id)}
                        disabled={verifyMutation.isPending || rejectMutation.isPending || !p.pop_url}
                        className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
                      >
                        {verifyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No payments yet.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Exhibitor</th>
                      <th className="px-4 py-3 font-semibold">Items</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 font-semibold">Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(p.created_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-medium">{p.exhibitor_name}</td>
                        <td className="px-4 py-3">
                          <span title={itemsSummary(p)}>
                            {(p.items || []).length} item{(p.items || []).length !== 1 ? 's' : ''} — {itemsSummary(p)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">${Number(p.amount).toLocaleString()} {p.currency}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">{p.method}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[p.status] || 'bg-muted text-muted-foreground'}`}>
                            {p.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.reference}</td>
                        <td className="px-4 py-3">
                          {p.pop_url ? (
                            <a href={p.pop_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber font-medium hover:underline whitespace-nowrap">
                              <FileText className="w-3.5 h-3.5" /> View
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">{p.method === 'eft' ? '—' : ''}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
