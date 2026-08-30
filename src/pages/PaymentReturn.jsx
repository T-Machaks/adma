import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Payment } from '@/api/entities';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 15;

// Landing point for both Paynow's real returnUrl and the stub checkout page — polls
// /api/payments/:id/status a few times since payment confirmation (real Paynow webhook,
// or the poll itself) may land slightly after the browser redirect does.
export default function PaymentReturn() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const [status, setStatus] = useState('pending');
  const [isSmsBundle, setIsSmsBundle] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        // .get() (not just .status()) so the "Back to…" link below can tell an SMS
        // credit purchase apart from a Rate Card one and send the exhibitor back to
        // the right page — same ownership check as .status(), just richer data.
        const res = await Payment.get(id);
        if (cancelled) return;
        setIsSmsBundle(res.items?.some(i => i.type === 'sms_bundle') ?? false);
        if (res.status !== 'pending') { setStatus(res.status); return; }
        attempts.current += 1;
        if (attempts.current >= MAX_ATTEMPTS) { setStatus('pending'); return; }
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    tick();

    return () => { cancelled = true; };
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm">No payment reference given.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
        {status === 'pending' && (
          <>
            <Loader2 className="w-10 h-10 text-amber animate-spin mx-auto mb-4" />
            <p className="font-heading font-bold text-sm">Confirming your payment…</p>
            <p className="text-xs text-muted-foreground mt-1">This usually only takes a few seconds.</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
            <p className="font-heading font-bold text-sm">Payment confirmed</p>
            <p className="text-xs text-muted-foreground mt-1">A confirmation email is on its way.</p>
          </>
        )}
        {status === 'cancelled' && (
          <>
            <XCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
            <p className="font-heading font-bold text-sm">Payment cancelled</p>
            <p className="text-xs text-muted-foreground mt-1">No charge was made — you can try again from the Rate Card.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
            <p className="font-heading font-bold text-sm">Couldn't check payment status</p>
            <p className="text-xs text-muted-foreground mt-1">Please check the Rate Card page or contact the organiser.</p>
          </>
        )}
        <Link
          to={isSmsBundle ? '/exhibitor/sms-credits' : '/exhibitor/rate-card'}
          className="inline-flex items-center gap-1.5 mt-6 text-sm bg-amber text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150"
        >
          {isSmsBundle ? 'Back to SMS Credits' : 'Back to Rate Card'}
        </Link>
      </div>
    </div>
  );
}
