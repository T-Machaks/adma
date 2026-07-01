import { X, Download, Share } from 'lucide-react';
import { useState } from 'react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function InstallBanner({ isIOS, onInstall, onDismiss }) {
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  if (isIOS) {
    return (
      <div className="bg-amber/10 border-b border-amber/20 px-4 py-2.5">
        {showIOSSteps ? (
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm text-slate-200">
              <p className="font-semibold text-amber mb-1">Add to Home Screen</p>
              <ol className="space-y-0.5 text-slate-300 text-xs">
                <li>1. Tap <Share className="inline w-3.5 h-3.5 text-amber align-text-bottom" /> <strong>Share</strong> in Safari</li>
                <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>3. Tap <strong>Add</strong></li>
              </ol>
            </div>
            <button onClick={onDismiss} className="text-slate-400 hover:text-white p-1 -mt-0.5 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Download className="w-4 h-4 text-amber flex-shrink-0" />
            <p className="flex-1 text-sm text-slate-200">
              Install <span className="font-semibold text-white">{EVENT_CONFIG.eventFullName}</span> for quick access
            </p>
            <button
              onClick={() => setShowIOSSteps(true)}
              className="text-xs font-semibold text-amber border border-amber/40 rounded-md px-2.5 py-1 hover:bg-amber/10 transition-colors flex-shrink-0"
            >
              How
            </button>
            <button onClick={onDismiss} className="text-slate-500 hover:text-white p-1 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber/10 border-b border-amber/20 px-4 py-2.5 flex items-center gap-3">
      <Download className="w-4 h-4 text-amber flex-shrink-0" />
      <p className="flex-1 text-sm text-slate-200">
        Install <span className="font-semibold text-white">{EVENT_CONFIG.eventFullName}</span> for quick access
      </p>
      <button
        onClick={onInstall}
        className="text-xs font-semibold text-amber border border-amber/40 rounded-md px-2.5 py-1 hover:bg-amber/10 transition-colors flex-shrink-0"
      >
        Install
      </button>
      <button onClick={onDismiss} className="text-slate-500 hover:text-white p-1 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}