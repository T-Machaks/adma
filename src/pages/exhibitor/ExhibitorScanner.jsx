import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, EngagementEvent } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import QRScanner from '@/components/QRScanner';
import {
  ScanLine, CheckCircle2, AlertCircle, UserCheck,
  Clock, Trash2, RefreshCw,
} from 'lucide-react';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function ExhibitorScanner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [scanState, setScanState] = useState('ready'); // ready | success | error
  const [lastVisitor, setLastVisitor] = useState(null);
  const [sessionLog, setSessionLog] = useState([]); // in-memory scan log for this session
  const [scanKey, setScanKey] = useState(0); // bump to remount QRScanner

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(null),
  });

  const myBooth =
    exhibitors.find(e =>
      e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
        || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
    ) ?? exhibitors[0];

  const handleScan = useCallback(
    async (parsed) => {
      if (parsed?.ev !== EVENT_CONFIG.qrEventCode || parsed?.t !== 'visitor') {
        setScanState('error');
        return;
      }

      const visitor = {
        id: parsed.id,
        name: parsed.n || 'Visitor',
        email: parsed.e || '',
        scanned_at: new Date().toISOString(),
      };

      setLastVisitor(visitor);
      setScanState('success');

      // Prepend to session log (newest first)
      setSessionLog(prev => [visitor, ...prev].slice(0, 50));

      if (myBooth) {
        await EngagementEvent.create({
          exhibitor_id: myBooth.id,
          exhibitor_name: myBooth.name,
          type: 'booth_scan',
          source: 'exhibitor_scan',
          visitor_id: parsed.id,
          visitor_name: parsed.n || '',
          visitor_email: parsed.e || '',
        });
        qc.invalidateQueries({ queryKey: ['engagements'] });
      }
    },
    [myBooth, qc]
  );

  const resetScanner = () => {
    setScanState('ready');
    setLastVisitor(null);
    setScanKey(k => k + 1); // remount QRScanner to restart camera
  };

  if (!myBooth) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <ScanLine className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">No booth linked to your account.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-amber" /> Visitor Scanner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan a visitor's badge QR code to log their booth visit and update your analytics.
        </p>
      </div>

      {/* Scanner area */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">

        {/* Success */}
        {scanState === 'success' && lastVisitor && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                Visitor Logged!
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber flex-shrink-0" />
                <span className="font-semibold text-sm">{lastVisitor.name}</span>
              </div>
              {lastVisitor.email && (
                <p className="text-xs text-muted-foreground pl-6">{lastVisitor.email}</p>
              )}
              <p className="text-xs text-muted-foreground pl-6 font-mono">ID: {lastVisitor.id}</p>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Booth visit recorded for <strong>{myBooth.name}</strong>
            </p>

            <button
              onClick={resetScanner}
              className="w-full flex items-center justify-center gap-2 bg-amber text-white font-semibold text-sm px-4 py-3 rounded-xl active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Scan Next Visitor
            </button>
          </div>
        )}

        {/* Error */}
        {scanState === 'error' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="font-heading text-base font-bold text-red-600 dark:text-red-400">
                Invalid Badge QR
              </p>
              <p className="text-sm text-muted-foreground">
                This QR code is not a valid {EVENT_CONFIG.eventFullName} visitor badge.
              </p>
            </div>
            <button
              onClick={resetScanner}
              className="w-full flex items-center justify-center gap-2 border border-border font-semibold text-sm px-4 py-3 rounded-xl hover:bg-muted active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Scanner */}
        {scanState === 'ready' && (
          <QRScanner key={scanKey} onScan={handleScan} className="min-h-72" />
        )}
      </div>

      {/* Session scan log */}
      {sessionLog.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber" /> Session Log
            </h2>
            <button
              onClick={() => setSessionLog([])}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {sessionLog.map((v, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  {v.email && <p className="text-xs text-muted-foreground truncate">{v.email}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                  {timeAgo(v.scanned_at)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {sessionLog.length} visitor{sessionLog.length !== 1 ? 's' : ''} scanned this session
          </p>
        </div>
      )}

      {sessionLog.length === 0 && scanState === 'ready' && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">No scans yet this session. Ask visitors to show their Visitor Badge QR.</p>
        </div>
      )}
    </div>
  );
}
