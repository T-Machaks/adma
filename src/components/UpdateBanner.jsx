import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdateReady = () => setVisible(true);
    window.addEventListener('adma:update-ready', onUpdateReady);
    return () => window.removeEventListener('adma:update-ready', onUpdateReady);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-steel text-white text-sm px-4 py-3 rounded-xl shadow-xl border border-white/10 max-w-[calc(100vw-2rem)]">
      <Sparkles className="w-4 h-4 text-amber flex-shrink-0" />
      <span className="flex-1">A new version of ADMA Digital is ready.</span>
      <button
        onClick={() => window.location.reload()}
        className="flex-shrink-0 text-xs font-semibold bg-amber text-slate-900 px-3 py-1.5 rounded-lg hover:bg-amber/90 active:scale-95 transition-all"
      >
        Refresh
      </button>
      <button onClick={() => setVisible(false)} className="flex-shrink-0 text-slate-300 hover:text-white p-1" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
