import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Registration } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import QRScanner from '@/components/QRScanner';
import {
  ScanLine, CheckCircle2, AlertCircle, XCircle, User,
  Ticket, Clock, RotateCcw, ClipboardList, ShieldCheck,
  Search, LogIn, Building2,
} from 'lucide-react';

const STATUS_STYLES = {
  success:        'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
  already_in:     'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
  cancelled:      'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700',
  invalid:        'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700',
  not_found:      'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700',
  token_mismatch: 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700',
};

const ICON_MAP = {
  success:        <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
  already_in:     <AlertCircle  className="w-12 h-12 text-amber-500" />,
  cancelled:      <XCircle      className="w-12 h-12 text-red-400" />,
  invalid:        <XCircle      className="w-12 h-12 text-red-400" />,
  not_found:      <XCircle      className="w-12 h-12 text-red-400" />,
  token_mismatch: <ShieldCheck  className="w-12 h-12 text-red-400" />,
};

const MESSAGES = {
  success:        'Entry Granted',
  already_in:     'Already Checked In',
  cancelled:      'Registration Cancelled',
  invalid:        'Invalid QR Code',
  not_found:      'Registration Not Found',
  token_mismatch: 'Security Mismatch — Possible Forgery',
};

const SUB_MESSAGES = {
  success:        'Ticket verified. Attendee may enter.',
  already_in:     'This ticket was already used for entry.',
  cancelled:      'This registration has been cancelled.',
  invalid:        `This QR code is not a valid ${EVENT_CONFIG.eventFullName} ticket.`,
  not_found:      'No registration matches this ticket ID.',
  token_mismatch: 'Token does not match registration record.',
};

const STATUS_BADGE = {
  'Checked In': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'Confirmed':  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'Cancelled':  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'Pending':    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
};

export default function CheckIn() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('scan');
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [confirming, setConfirming] = useState(null); // reg to confirm manual check-in

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => Registration.list('-created_date'),
  });

  const checkedIn = registrations.filter(r => r.checked_in);

  const doCheckIn = useMutation({
    mutationFn: (id) =>
      Registration.update(id, {
        checked_in: true,
        check_in_time: new Date().toISOString(),
        status: 'Checked In',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['registrations'] }),
  });

  const handleScan = useCallback(
    async (parsed) => {
      if (parsed?.t !== 'ticket' || parsed?.ev !== EVENT_CONFIG.qrEventCode) {
        setResult({ outcome: 'invalid', reg: null });
        return;
      }

      const { rid, tok } = parsed;
      const reg = await Registration.get(rid);

      if (!reg) { setResult({ outcome: 'not_found', reg: null }); return; }
      if (reg.token !== tok) { setResult({ outcome: 'token_mismatch', reg }); return; }
      if (reg.status === 'Cancelled') { setResult({ outcome: 'cancelled', reg }); return; }
      if (reg.checked_in) { setResult({ outcome: 'already_in', reg }); return; }

      await doCheckIn.mutateAsync(reg.id);
      setResult({ outcome: 'success', reg });
    },
    [doCheckIn]
  );

  const handleManualCheckIn = async (reg) => {
    if (reg.checked_in || reg.status === 'Cancelled') return;
    await doCheckIn.mutateAsync(reg.id);
    setConfirming(null);
  };

  const reset = () => setResult(null);

  const fmt = (iso) => iso
    ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—';

  const q = search.trim().toLowerCase();
  const filtered = q.length < 1 ? [] : registrations.filter(r =>
    r.full_name?.toLowerCase().includes(q) ||
    r.email?.toLowerCase().includes(q) ||
    r.company?.toLowerCase().includes(q)
  );

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Gate Check-In</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Verify attendee entry by QR scan or manual lookup</p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div>
            <p className="font-heading text-2xl font-bold text-emerald-500">{checkedIn.length}</p>
            <p className="text-xs text-muted-foreground">In</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-muted-foreground">{registrations.length - checkedIn.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'scan',   label: 'QR Scanner',    icon: ScanLine },
          { id: 'lookup', label: 'Manual Lookup',  icon: Search },
          { id: 'log',    label: 'Check-In Log',   icon: ClipboardList },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); reset(); setConfirming(null); }}
            className={`flex items-center gap-2 flex-1 justify-center py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'border-amber text-amber' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── QR SCANNER ── */}
      {tab === 'scan' && (
        <div className="px-4 pt-6 space-y-4">
          {result && (
            <div className={`border rounded-2xl p-6 text-center space-y-3 ${STATUS_STYLES[result.outcome]}`}>
              <div className="flex justify-center">{ICON_MAP[result.outcome]}</div>
              <div>
                <p className="font-heading text-xl font-bold">{MESSAGES[result.outcome]}</p>
                <p className="text-sm text-muted-foreground mt-1">{SUB_MESSAGES[result.outcome]}</p>
              </div>
              {result.reg && (
                <div className="bg-background/60 rounded-xl p-4 text-left space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-semibold text-sm">{result.reg.full_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
                    <span>Email: <span className="text-foreground">{result.reg.email}</span></span>
                    <span>Role: <span className="text-foreground">{result.reg.role_type}</span></span>
                    <span>Ticket: <span className="text-foreground">{result.reg.ticket_type}</span></span>
                    <span>Badge: <span className="text-foreground">{result.reg.badge_category}</span></span>
                    {result.outcome === 'already_in' && (
                      <span className="col-span-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Checked in at {fmt(result.reg.check_in_time)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <button onClick={reset}
                className="flex items-center gap-2 mx-auto bg-steel text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all">
                <RotateCcw className="w-4 h-4" /> Scan Next
              </button>
            </div>
          )}

          {!result && (
            <>
              <QRScanner onScan={handleScan} className="min-h-72" />
              <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>Each ticket QR contains a unique cryptographic token. The scanner verifies it against the registration record and blocks re-use — a ticket can only grant entry once.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MANUAL LOOKUP ── */}
      {tab === 'lookup' && (
        <div className="px-4 pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={e => { setSearch(e.target.value); setConfirming(null); }}
              placeholder="Search by name, email, or company…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>

          {q.length > 0 && filtered.length === 0 && (
            <div className="text-center py-10">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No registrations match "{q}"</p>
            </div>
          )}

          {q.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Type a name, email, or company to search registrations
            </div>
          )}

          <div className="space-y-2">
            {filtered.map(r => {
              const isTarget = confirming?.id === r.id;
              return (
                <div key={r.id} className={`bg-card border rounded-xl px-4 py-3 transition-colors ${isTarget ? 'border-amber' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{r.full_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || STATUS_BADGE['Pending']}`}>
                          {r.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />{r.ticket_type}</span>
                        {r.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{r.company}</span>}
                        {r.checked_in && <span className="flex items-center gap-1 text-emerald-600"><Clock className="w-3 h-3" />In at {fmt(r.check_in_time)}</span>}
                      </div>
                    </div>

                    {r.checked_in ? (
                      <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    ) : r.status === 'Cancelled' ? (
                      <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirming(isTarget ? null : r)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                          isTarget ? 'bg-amber text-white' : 'bg-muted hover:bg-amber/10 hover:text-amber'
                        }`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {isTarget ? 'Confirm?' : 'Check In'}
                      </button>
                    )}
                  </div>

                  {/* Inline confirm step */}
                  {isTarget && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                      <p className="text-xs text-muted-foreground flex-1">
                        Manually check in <strong>{r.full_name}</strong>? This cannot be undone.
                      </p>
                      <button onClick={() => setConfirming(null)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleManualCheckIn(r)}
                        disabled={doCheckIn.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                        Yes, Check In
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOG ── */}
      {tab === 'log' && (
        <div className="px-4 pt-6 space-y-3">
          {checkedIn.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            </div>
          ) : (
            checkedIn
              .slice()
              .sort((a, b) => (b.check_in_time || '').localeCompare(a.check_in_time || ''))
              .map(r => (
                <div key={r.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.ticket_type} · {r.badge_category} · {r.company || r.email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-muted-foreground">{fmt(r.check_in_time)}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Ticket className="w-3 h-3 text-amber" />
                      <span className="text-[10px] text-amber font-medium">{r.role_type}</span>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}