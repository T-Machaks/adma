import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Payment } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Receipt, Loader2, FileText, DollarSign, ArrowLeft } from 'lucide-react';

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

// Read-only personal payment history — the server already scopes GET /api/payments to
// "mine" (own exhibitor booth's records, or own created_by_user_id for non-exhibitor
// purchases), so this is just PaymentsLedger.jsx's table minus the EFT-review actions.
export default function PaymentHistory() {
  const { user } = useAuth();
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => Payment.list() });
  const backTo = user?.role === 'exhibitor' ? '/exhibitor/rate-card' : '/rate-card';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Rate Card
        </Link>
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber" /> Payment History
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Everything you've purchased through the Rate Card, and its current status.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : payments.length === 0 ? (
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
                        <a href={p.pop_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber font-medium hover:underline">
                          <FileText className="w-3.5 h-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
