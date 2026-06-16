import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Registration, Exhibitor, EngagementEvent } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import QRScanner from '@/components/QRScanner';
import {
  QrCode, ScanLine, Info, CheckCircle2, AlertCircle,
  Calendar, MapPin, ChevronRight, Ticket, Lock,
} from 'lucide-react';

const TABS = [
  { id: 'badge', label: 'My Badge', icon: QrCode },
  { id: 'scan',  label: 'Scan Booth', icon: ScanLine },
  { id: 'info',  label: 'How It Works', icon: Info },
];

function getOrCreateVisitorId() {
  let vid = localStorage.getItem('minecon_vid');
  if (!vid) {
    vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
    localStorage.setItem('minecon_vid', vid);
  }
  return vid;
}

export default function QRResources() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('badge');
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error'
  const [scannedExhibitor, setScannedExhibitor] = useState(null);

  const { data: registrations = [] } = useQuery({
    queryKey: ['my-registration'],
    queryFn: () => Registration.list(null),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(null),
  });

  const myReg = registrations.find(
    r => r.email?.toLowerCase() === user?.email?.toLowerCase()
  ) ?? registrations[0];

  const displayName =
    myReg?.full_name ||
    myReg?.name ||
    user?.full_name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Visitor';

  const visitorId = getOrCreateVisitorId();
  const badgeQR = JSON.stringify({
    t: 'visitor',
    id: visitorId,
    n: displayName,
    e: user?.email || '',
    ev: 'mc26',
  });

  const ticketQR = myReg?.token
    ? JSON.stringify({ t: 'ticket', ev: 'mc26', rid: myReg.id, tok: myReg.token })
    : null;

  const handleScan = useCallback(
    async (parsed) => {
      if (parsed?.ev !== 'mc26') {
        setScanResult('error');
        return;
      }
      if (parsed?.t === 'exhibitor') {
        // Find full exhibitor record for logo/description
        const ex =
          exhibitors.find(e => e.id === parsed.id) ||
          exhibitors.find(e => e.name === parsed.n) || {
            id: parsed.id,
            name: parsed.n,
            booth: parsed.b,
            section: parsed.s,
          };
        setScannedExhibitor(ex);
        setScanResult('success');
        await EngagementEvent.create({
          exhibitor_id: parsed.id,
          exhibitor_name: parsed.n,
          type: 'qr_scan',
          source: 'visitor_scan',
          visitor_id: visitorId,
          visitor_name: displayName,
        });
        qc.invalidateQueries({ queryKey: ['engagements'] });
      } else {
        setScanResult('error');
      }
    },
    [exhibitors, visitorId, displayName, qc]
  );

  const resetScan = () => {
    setScanResult(null);
    setScannedExhibitor(null);
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id !== 'scan') resetScan(); }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-all duration-150 active:scale-95 border-b-2 ${
              tab === id
                ? 'border-amber text-amber'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── MY BADGE ──────────────────────────────────────────────────────── */}
      {tab === 'badge' && (
        <div className="px-4 pt-6 space-y-5">
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">My Visitor Badge</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Exhibitors scan this QR code at their booth to log your visit and update their analytics.
            </p>
          </div>

          {/* Badge card */}
          <div className="bg-steel text-white rounded-2xl overflow-hidden">
            <div className="bg-amber px-5 py-3 flex items-center gap-3">
              <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-sm tracking-widest uppercase">MineCon 2026 · Visitor Badge</span>
            </div>
            <div className="p-5 flex gap-5 items-start">
              <div className="bg-white p-2 rounded-xl flex-shrink-0">
                <QRCodeDisplay value={badgeQR} size={120} />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Name</p>
                  <p className="font-heading text-lg font-bold leading-tight">{displayName}</p>
                </div>
                {user?.email && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="text-sm text-slate-300 truncate">{user.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Visitor ID</p>
                  <p className="text-sm font-mono text-amber">{visitorId}</p>
                </div>
                {myReg?.ticket_type && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Ticket</p>
                    <p className="text-sm text-slate-300">{myReg.ticket_type}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Standalone shareable QR */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="font-heading font-bold text-sm uppercase tracking-wide mb-4 text-center">Shareable Badge QR</p>
            <QRCodeDisplay
              value={badgeQR}
              size={180}
              label={displayName}
              sublabel="MineCon 2026 Visitor"
            />
          </div>

          {/* Registration ticket QR — for gate check-in */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="bg-steel px-4 py-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-amber" />
              <span className="font-heading font-bold text-sm uppercase tracking-widest text-white">Entry Ticket QR</span>
              <Lock className="w-3.5 h-3.5 text-amber ml-auto" />
            </div>
            {ticketQR ? (
              <div className="p-5 space-y-4">
                <QRCodeDisplay
                  value={ticketQR}
                  size={180}
                  label={displayName}
                  sublabel={`${myReg.ticket_type} · ${myReg.badge_category}`}
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Ticket', myReg.ticket_type],
                    ['Badge', myReg.badge_category],
                    ['Days', [myReg.day1 && 'D1', myReg.day2 && 'D2', myReg.day3 && 'D3'].filter(Boolean).join(' ')],
                    ['Status', myReg.checked_in ? 'Checked In ✓' : (myReg.status || 'Pending')],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-muted rounded-lg px-3 py-2">
                      <p className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</p>
                      <p className="font-semibold mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>
                {myReg.checked_in && (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">Checked in — this ticket has already been used for entry.</p>
                  </div>
                )}
                <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>This QR is tied to your registration and can only be used once. Present it at the gate for entry.</p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-2">
                <Ticket className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold">No registration found</p>
                <p className="text-xs text-muted-foreground">Complete your registration to receive an entry ticket QR code.</p>
                <a href="/register" className="inline-block mt-2 text-amber text-xs font-medium underline">Register now →</a>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>Your visitor badge (above) is for exhibitor booths. Your entry ticket QR (below) is for gate check-in.</p>
          </div>
        </div>
      )}

      {/* ── SCAN BOOTH ───────────────────────────────────────────────────── */}
      {tab === 'scan' && (
        <div className="px-4 pt-6 space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Scan Exhibitor Booth</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Scan the QR code on an exhibitor's stand to confirm your visit and log the interaction.
            </p>
          </div>

          {/* Success state */}
          {scanResult === 'success' && scannedExhibitor && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <p className="font-heading text-lg font-bold text-emerald-700 dark:text-emerald-300">Booth Visit Confirmed!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Your visit to <strong>{scannedExhibitor.name}</strong> has been logged.
                </p>
              </div>

              {/* Exhibitor card */}
              <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
                <div className="w-12 h-12 bg-white border border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {scannedExhibitor.logo_url
                    ? <img src={scannedExhibitor.logo_url} alt={scannedExhibitor.name} className="w-11 h-11 object-contain" />
                    : <span className="font-heading text-xl font-bold text-muted-foreground">{scannedExhibitor.name?.[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{scannedExhibitor.name}</p>
                  {(scannedExhibitor.booth || scannedExhibitor.section) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {[scannedExhibitor.section, `Booth ${scannedExhibitor.booth}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {scannedExhibitor.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scannedExhibitor.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="/meetings"
                  className="flex-1 flex items-center justify-center gap-2 bg-amber text-white font-semibold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all"
                >
                  <Calendar className="w-4 h-4" /> Book Meeting
                </a>
                <button
                  onClick={resetScan}
                  className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-muted active:scale-95 transition-all"
                >
                  <ScanLine className="w-4 h-4" /> Scan Another
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {scanResult === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 rounded-2xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="font-heading text-base font-bold text-red-700 dark:text-red-300">QR Code Not Recognised</p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  This QR code doesn't appear to be a valid MineCon 2026 exhibitor code.
                </p>
              </div>
              <button
                onClick={resetScan}
                className="w-full flex items-center justify-center gap-2 bg-amber text-white font-semibold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-all"
              >
                <ScanLine className="w-4 h-4" /> Try Again
              </button>
            </div>
          )}

          {/* Scanner */}
          {!scanResult && (
            <QRScanner onScan={handleScan} className="min-h-64" />
          )}
        </div>
      )}

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      {tab === 'info' && (
        <div className="px-4 pt-6 space-y-5">
          <div>
            <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">How QR Engagement Works</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Two-way QR scanning connects visitors and exhibitors in real time.
            </p>
          </div>

          {/* Visitor flow */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-heading font-bold text-sm uppercase tracking-wide text-amber mb-3">Visitor → Exhibitor</p>
            <div className="space-y-2.5">
              {[
                { n: '1', t: 'Show your Visitor Badge QR at any booth' },
                { n: '2', t: 'The exhibitor scans your badge using the Exhibitor Portal scanner' },
                { n: '3', t: "Your booth visit is logged against the exhibitor's analytics" },
                { n: '4', t: 'The exhibitor can follow up with you after the event' },
              ].map(s => (
                <div key={s.n} className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-amber rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{s.n}</div>
                  <p className="text-sm text-muted-foreground leading-snug">{s.t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Exhibitor flow */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="font-heading font-bold text-sm uppercase tracking-wide text-steel mb-3">Exhibitor → Visitor</p>
            <div className="space-y-2.5">
              {[
                { n: '1', t: 'Each exhibitor booth displays their unique QR code' },
                { n: '2', t: "Open \"Scan Booth\" on the QR tab and scan the exhibitor's QR code" },
                { n: '3', t: "Your visit is recorded in the exhibitor's engagement analytics" },
                { n: '4', t: 'You can immediately book a meeting or save contact details' },
              ].map(s => (
                <div key={s.n} className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-steel rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{s.n}</div>
                  <p className="text-sm text-muted-foreground leading-snug">{s.t}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-2">
            <button
              onClick={() => setTab('badge')}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors active:scale-[0.98]"
            >
              <QrCode className="w-5 h-5 text-amber" />
              <span className="text-sm font-medium flex-1 text-left">View My Visitor Badge</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setTab('scan')}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors active:scale-[0.98]"
            >
              <ScanLine className="w-5 h-5 text-amber" />
              <span className="text-sm font-medium flex-1 text-left">Scan an Exhibitor's QR Code</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
