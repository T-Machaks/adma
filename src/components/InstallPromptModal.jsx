import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, Link } from 'lucide-react';
import { usePWAInstall } from '@/lib/PWAInstallContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function InstallPromptModal() {
  const { showPopup, isIOS, hasBrowserPrompt, promptInstall, markSeen } = usePWAInstall();
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!showPopup) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [showPopup]);

  useEffect(() => {
    if (!showPopup) setOpen(false);
  }, [showPopup]);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    markSeen();
  };

  const handleCopyLink = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: EVENT_CONFIG.eventFullName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled share or clipboard unavailable
    }
  };

  const handleInstall = async () => {
    if (!hasBrowserPrompt) return;
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
    setOpen(false);
    markSeen();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-2xl bg-[#12241a] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${hasBrowserPrompt && !isIOS ? 'cursor-pointer' : ''}`}
        onClick={hasBrowserPrompt && !isIOS ? handleInstall : undefined}
      >
        {/* Amber top stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-amber via-amber/80 to-amber/40" />

        {/* Close */}
        <button
          onClick={e => { e.stopPropagation(); dismiss(); }}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-5">
          {/* Logo + title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber/10 border border-amber/20 flex items-center justify-center flex-shrink-0">
              <img src={EVENT_CONFIG.logo.transparent} alt={EVENT_CONFIG.eventName} className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">{EVENT_CONFIG.eventFullName}</p>
              <p className="text-xs text-amber font-medium">Zimbabwe's Premier Agricultural Exhibition</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 mb-5 leading-relaxed">
            Add to your home screen for instant access to schedules, exhibitors, and live updates — even offline.
          </p>

          {/* iOS instructions */}
          {isIOS && (
            <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-2.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How to install on iOS</p>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber/20 text-amber text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <p className="text-sm text-slate-300">
                  Tap <Share className="inline w-3.5 h-3.5 text-amber align-text-bottom mx-0.5" />
                  <strong className="text-white"> Share</strong> in the Safari toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber/20 text-amber text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <p className="text-sm text-slate-300">Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber/20 text-amber text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <p className="text-sm text-slate-300">Tap <strong className="text-white">Add</strong> to confirm</p>
              </div>
            </div>
          )}

          {/* Desktop fallback — no native prompt */}
          {!isIOS && !hasBrowserPrompt && (
            <div className="bg-white/5 rounded-xl p-4 mb-5 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">
                Click the <strong className="text-white">install icon</strong> in your browser's address bar, or open the browser menu and choose <strong className="text-white">"Install {EVENT_CONFIG.eventFullName}"</strong>.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            {hasBrowserPrompt && !isIOS && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {installing ? 'Installing…' : 'Install Now'}
              </button>
            )}
            {isIOS && (
              <button
                onClick={dismiss}
                className="w-full flex items-center justify-center gap-2 bg-amber hover:bg-amber/90 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                Got it
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium rounded-xl py-3 text-sm transition-colors"
            >
              <Link className="w-4 h-4" />
              {copied ? 'Link Copied!' : navigator.share ? 'Share Link' : 'Copy Link'}
            </button>
            <button
              onClick={dismiss}
              className="w-full text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}