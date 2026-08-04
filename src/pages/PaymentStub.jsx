import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Payment } from '@/api/entities';
import { CreditCard, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

// Only ever reachable when Paynow isn't configured yet (server/lib/paynow.js returns this
// URL as the "redirectUrl" in stub mode instead of a real Paynow checkout link) — stands
// in for Paynow's hosted checkout page so the whole pay → confirm → activate flow can be
// exercised end-to-end before real integration credentials exist.
export default function PaymentStub() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choice, setChoice] = useState(null);

  const { data: payment, isLoading } = useQuery({ queryKey: ['payment', id], queryFn: () => Payment.get(id) });

  const simulate = useMutation({
    mutationFn: (outcome) => Payment.simulate(id, outcome),
    onSuccess: () => navigate(`/payment/return?id=${id}`),
  });

  if (isLoading || !payment) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber/10 border-b border-amber/20 px-5 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber flex-shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber">Test Mode — Paynow not yet configured</p>
        </div>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-steel rounded-xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <p className="font-heading text-sm font-bold uppercase tracking-wide">{payment.item_label}</p>
          <p className="font-heading text-3xl font-bold mt-2">${Number(payment.amount).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{payment.currency} · {payment.period} · Ref {payment.reference}</p>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => { setChoice('paid'); simulate.mutate('paid'); }}
              disabled={simulate.isPending}
              className="w-full flex items-center justify-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {simulate.isPending && choice === 'paid' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Simulate Successful Payment
            </button>
            <button
              onClick={() => { setChoice('cancelled'); simulate.mutate('cancelled'); }}
              disabled={simulate.isPending}
              className="w-full flex items-center justify-center gap-2 text-sm border border-border hover:bg-muted text-foreground font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {simulate.isPending && choice === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Simulate Cancelled
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
