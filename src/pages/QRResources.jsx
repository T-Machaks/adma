import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Registration, Exhibitor, EngagementEvent } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import QRScanner from '@/components/QRScanner';
import {
  QrCode, ScanLine, Info, CheckCircle2, AlertCircle,
  Calendar, MapPin, ChevronRight, Ticket, Lock, LogIn, UserPlus,
} from 'lucide-react';

const TABS = [
  { id: 'badge', label: 'My Badge', icon: QrCode },
  { id: 'scan',  label: 'Scan Booth', icon: ScanLine },
  { id: 'info',  label: 'How It Works', icon: Info },
];

function getOrCreateVisitorId() {
  let vid = localStorage.getItem(`${EVENT_CONFIG.storagePrefix}_vid`);
  if (!vid) {
    vid = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase();
    localStorage.setItem(`${EVENT_CONFIG.storagePrefix}_vid`, vid);
  }
  return vid;
}

export default function QRResources() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('badge');
  const [scanResult, setScanResult] = useState(null); // null | 'success' | 'error'
  const [scannedExhibitor, setScannedExhibitor] = useState(null);

  const { data: myRegs = [], isLoading: isLoadingReg } = useQuery({
    queryKey: ['my-registrations', user?.email],
    queryFn: () => Registration.listByEmail(user.email),
    enabled: !!user?.email,
  });
  // Primary reg used for badge display (most recent confirmed, else any)
  const myReg = myRegs.find(r => r.status === 'Confirmed') ?? myRegs[0] ?? null;

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(null),
    enabled: !!myReg,
  });

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
    ev: EVENT_CONFIG.qrEventCode,
  });

  const ticketQR = myReg?.token
    ? JSON.stringify({ t: 'ticket', ev: EVENT_CONFIG.qrEventCode, rid: myReg.id, tok: myReg.token })
    : null;

  const handleScan = useCallback(
    async (parsed) => {
      if (parsed?.ev !== EVENT_CONFIG.qrEventCode) {
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

  if (isLoadingAuth || (isAuthenticated && isLoadingReg)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-amber/10 rounded-full flex items-center justify-center mb-4">
          <QrCode className="w-8 h-8 text-amber" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Account Required</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          QR Resources are linked to your registered account. Sign in or create a free account to access your visitor badge and entry ticket.
        </p>
        <div className="flex gap-3">
          <Link to="/login" className="flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber/90 transition-colors">
            <LogIn className="w-4 h-4" /> Sign In
          </Link>
          <Link to="/signup" className="flex items-center gap-2 border border-border bg-card text-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted transition-colors">
            <UserPlus className="w-4 h-4" /> Create Account
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoadingReg && myRegs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Ticket className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">No Ticket Linked</h2>
        <p className="text-muted-foreground text-sm mb-2 max-w-xs">
          Your account <span className="font-medium text-foreground">{user?.email}</span> does not have a registered event ticket.
        </p>
        <p className="text-muted-foreground text-xs mb-6 max-w-xs">
          Register for {EVENT_CONFIG.eventFullName} to receive your entry ticket and visitor badge QR codes.
        </p>
        <Link to="/register" className="flex items-center gap-2 bg-amber text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber/90 transition-colors">
          <Ticket className="w-4 h-4" /> Register for {EVENT_CONFIG.eventFullName}
        </Link>
        <p className="text-xs text-muted-foreground mt-4">
          Already registered?{' '}
          <span className="text-amber">Contact support if your ticket isn't appearing.</span>
        </p>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl lg:max-w-4xl mx-auto">
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
              <span className="font-heading font-bold text-sm tracking-widest uppercase">{EVENT_CONFIG.eventFullName} · Visitor Badge</span>
            </div>
            <div className="p-5 flex gap-5 items-start">
              <div className="bg-white p-2 rounded-xl flex-shrink-0">
                <QRCodeDisplay value={badgeQR} size={120} compact />
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

          {/* Entry Ticket QR(s) — one per ticket across all registrations */}
          {(() => {
            // Flatten all registrations into individual ticket slots
            const allTickets = myRegs.flatMap(reg =>
              Array.from({ length: Math.max(1, Number(reg.quantity) || 1) }, (_, i) => ({ reg, n: i + 1 }))
            );
            const totalQty = allTickets.length;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-amber" /> Entry Ticket{totalQty !== 1 ? `s (${totalQty})` : ''}
                  </h2>
                  {totalQty > 1 && <span className="text-xs bg-amber text-white px-2 py-0.5 rounded-full font-medium">{totalQty} tickets</span>}
                </div>
                {allTickets.length > 0 && allTickets[0].reg.token ? (
                  allTickets.map(({ reg, n }, idx) => {
                    const tQR = JSON.stringify({ t: 'ticket', ev: EVENT_CONFIG.qrEventCode, rid: reg.id, tok: reg.token, n });
                    const label = totalQty > 1 ? `Ticket ${idx + 1} of ${totalQty}` : 'Entry Ticket';
                    return (
                      <div key={`${reg.id}-${n}`} className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="bg-steel px-4 py-3 flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-amber" />
                          <span className="font-heading font-bold text-sm uppercase tracking-widest text-white">{label}</span>
                          <Lock className="w-3.5 h-3.5 text-amber ml-auto" />
                        </div>
                        <div className="p-5 space-y-4">
                          <QRCodeDisplay
                            value={tQR}
                            size={180}
                            label={totalQty > 1 ? `${displayName} — Ticket ${idx + 1}` : displayName}
                            sublabel={`${reg.ticket_type} · ${reg.badge_category}`}
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              ['Ticket', reg.ticket_type],
                              ['Badge', reg.badge_category],
                              ['Days', [reg.day1 && 'D1', reg.day2 && 'D2', reg.day3 && 'D3'].filter(Boolean).join(' ')],
                              ['Status', reg.checked_in ? 'Checked In ✓' : (reg.status || 'Pending')],
                            ].map(([lbl, val]) => (
                              <div key={lbl} className="bg-muted rounded-lg px-3 py-2">
                                <p className="text-muted-foreground uppercase tracking-wide text-[10px]">{lbl}</p>
                                <p className="font-semibold mt-0.5 truncate">{val}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
                            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <p>Present this QR at the gate for entry. Each ticket can only be used once.</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-2">
                    <Ticket className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold">No entry ticket found</p>
                    <p className="text-xs text-muted-foreground">Complete your event registration to receive entry ticket QR codes.</p>
                    <a href="/register" className="inline-block mt-2 text-amber text-xs font-medium underline">Register now →</a>
                  </div>
                )}
              </div>
            );
          })()}

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
                  This QR code doesn't appear to be a valid {EVENT_CONFIG.eventFullName} exhibitor code.
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
