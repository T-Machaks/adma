import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Building2, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TIERS = ['Diamond', 'Gold', 'Chrome', 'Copper'];

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  icon: Clock,        className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  approved: { label: 'Approved', icon: CheckCircle,  className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected: { label: 'Rejected', icon: XCircle,      className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const TIER_COLORS = {
  Diamond: 'text-cyan-500',
  Gold:    'text-amber-500',
  Chrome:  'text-slate-400',
  Copper:  'text-orange-600',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function ApplicationCard({ app, onApprove, onReject, busy }) {
  const [open, setOpen]           = useState(false);
  const [approvedTier, setApprovedTier] = useState(app.tier);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {app.logo_url && (
          <img src={app.logo_url} alt={app.company} className="w-12 h-12 rounded-lg object-contain border border-border flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{app.company}</p>
            <span className={`text-xs font-medium ${TIER_COLORS[app.tier]}`}>{app.tier}</span>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{app.full_name} · {app.email}</p>
          <p className="text-xs text-muted-foreground">{new Date(app.created_date).toLocaleDateString()}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Description */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm">{app.description}</p>
          </div>

          {/* Logo full size */}
          {app.logo_url && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Logo</p>
              <img src={app.logo_url} alt={app.company} className="w-24 h-24 rounded-xl object-contain border border-border bg-muted/20 p-1" />
            </div>
          )}

          {app.status === 'pending' && (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Approve */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={approvedTier}
                  onChange={e => setApprovedTier(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button
                  size="sm"
                  onClick={() => onApprove(app.id, approvedTier)}
                  disabled={busy === app.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {busy === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowReject(v => !v)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </Button>
              </div>

              {showReject && (
                <div className="space-y-2">
                  <textarea
                    placeholder="Optional: reason for rejection (sent to applicant)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(app.id, rejectReason)}
                    disabled={busy === app.id}
                  >
                    {busy === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Confirm rejection
                  </Button>
                </div>
              )}
            </div>
          )}

          {app.status === 'approved' && (
            <p className="text-xs text-green-600">Approved at {app.approved_tier} tier on {new Date(app.approved_date).toLocaleDateString()}</p>
          )}
          {app.status === 'rejected' && app.rejection_reason && (
            <p className="text-xs text-muted-foreground">Reason: {app.rejection_reason}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExhibitorApplications() {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [busy, setBusy]       = useState(null);
  const [toast, setToast]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exhibitor-applications${filter ? `?status=${filter}` : ''}`);
      setApps(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleApprove = async (id, tier) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/exhibitor-applications/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_tier: tier }),
      });
      if (res.ok) { showToast('Approved — account created and email sent.'); load(); }
      else { const d = await res.json(); showToast(`Error: ${d.error}`); }
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id, reason) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/exhibitor-applications/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) { showToast('Application rejected — email sent to applicant.'); load(); }
      else { const d = await res.json(); showToast(`Error: ${d.error}`); }
    } finally {
      setBusy(null);
    }
  };

  const counts = { pending: 0, approved: 0, rejected: 0 };
  apps.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-amber" />
          Exhibitor Applications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Review and approve exhibitor registration requests.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-amber text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s && <span className="ml-1.5 text-xs opacity-70">{counts[s] || 0}</span>}
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 text-primary text-sm font-medium">{toast}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {filter} applications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <ApplicationCard key={app.id} app={app} onApprove={handleApprove} onReject={handleReject} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}
