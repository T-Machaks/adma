import { useQuery } from '@tanstack/react-query';
import { Payment } from '@/api/entities';
import { DollarSign, Loader2 } from 'lucide-react';

const STATUS_STYLES = {
  paid:      'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
};

const TYPE_LABELS = {
  package: 'Package',
  marketplace_addon: 'Marketplace Add-on',
  adslot_request: 'Ad Slot',
  magazine_request: 'Magazine',
};

export default function PaymentsLedger() {
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => Payment.list() });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-amber" />
          Payments
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Every Paynow payment attempt across packages, marketplace add-ons, ad slots & magazine placements.</p>
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
                  <th className="px-4 py-3 font-semibold">Exhibitor</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(p.created_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">{p.exhibitor_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[p.type] || p.type}</td>
                    <td className="px-4 py-3">{p.item_label}</td>
                    <td className="px-4 py-3 font-semibold">${Number(p.amount).toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.reference}</td>
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
