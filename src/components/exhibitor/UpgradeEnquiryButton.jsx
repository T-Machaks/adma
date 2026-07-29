import { useState } from 'react';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Exhibitor } from '@/api/entities';

// Replaces the old mailto: "Enquire to Upgrade" links — actually sends the enquiry
// to the organiser's configured address plus a confirmation copy to the exhibitor,
// rather than depending on the visitor's device having a mail client configured.
export default function UpgradeEnquiryButton({ targetPackage, className, children }) {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const handleClick = async () => {
    setStatus('sending');
    setError('');
    try {
      await Exhibitor.requestUpgradeEnquiry({ target_package: targetPackage });
      setStatus('sent');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 ${className || ''}`}>
        <CheckCircle className="w-4 h-4 flex-shrink-0" /> Sent — we'll be in touch
      </span>
    );
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={status === 'sending'} className={className}>
        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : children ?? <>Enquire to Upgrade <ArrowRight className="w-4 h-4" /></>}
      </button>
      {status === 'error' && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
