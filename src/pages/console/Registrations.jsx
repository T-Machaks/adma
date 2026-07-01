import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Registration } from '@/api/entities';
import { Users, Search, Filter, CheckCircle, Clock, XCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';

const STATUSES = ['Pending', 'Confirmed', 'Checked In', 'Cancelled'];
const ROLE_TYPES = ['All', 'Attendee', 'Exhibitor', 'Speaker', 'Sponsor', 'VIP Guest'];

const STATUS_STYLES = {
  'Pending':    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Confirmed':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Checked In': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Cancelled':  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Registrations() {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expanded, setExpanded]       = useState(null);

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => Registration.list(),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => Registration.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['registrations'] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return registrations.filter(r => {
      if (roleFilter !== 'All' && r.role_type !== roleFilter) return false;
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (q && !r.full_name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [registrations, search, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    total:      registrations.length,
    tickets:    registrations.reduce((s, r) => s + (Number(r.quantity) || 1), 0),
    pending:    registrations.filter(r => r.status === 'Pending').length,
    confirmed:  registrations.filter(r => r.status === 'Confirmed').length,
    checkedIn:  registrations.filter(r => r.status === 'Checked In').length,
  }), [registrations]);

  function exportCsv() {
    const cols = ['full_name', 'email', 'role_type', 'ticket_type', 'quantity', 'total_amount', 'payment_status', 'status', 'exhibitor_tier', 'badge_category'];
    const header = cols.join(',');
    const rows = registrations.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `adma-registrations-${Date.now()}.csv`; a.click();
  }

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Registrations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {counts.total} registration{counts.total !== 1 ? 's' : ''} · {counts.tickets} ticket{counts.tickets !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={exportCsv}
          className="flex items-center gap-2 text-xs font-semibold border border-border px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Registrations', value: counts.total,     icon: Users,        color: 'text-foreground',     bg: 'bg-muted' },
          { label: 'Tickets',       value: counts.tickets,   icon: Users,        color: 'text-violet-600',     bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Pending',       value: counts.pending,   icon: Clock,        color: 'text-amber-600',      bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Confirmed',     value: counts.confirmed, icon: CheckCircle,  color: 'text-emerald-600',    bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Checked In',    value: counts.checkedIn, icon: CheckCircle,  color: 'text-blue-600',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 flex flex-col items-center text-center`}>
              <Icon className={`w-4 h-4 ${s.color} mb-1`} />
              <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber">
          {ROLE_TYPES.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-amber">
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {filtered.length} of {counts.total} registrations
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold">No registrations found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(r => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id}>
                  {/* Row */}
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                      {(r.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.email} · {r.role_type}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{r.ticket_type}</span>
                      {r.quantity > 1 && (
                        <span className="text-[10px] bg-amber/10 text-amber px-1.5 py-0.5 rounded font-bold">×{r.quantity}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[r.status] || 'bg-muted text-muted-foreground'}`}>
                      {r.status || 'Pending'}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 bg-muted/20 border-t border-border space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                        {[
                          ['Email', r.email],
                          ['Ticket', r.ticket_type],
                          ['Quantity', r.quantity || 1],
                          ['Badge', r.badge_category],
                          ['Total', r.total_amount != null ? `$${r.total_amount}` : '—'],
                          ['Payment', r.payment_method || '—'],
                          ['Pay Status', r.payment_status || '—'],
                          ['Pay Ref', r.payment_ref || '—'],
                          r.exhibitor_tier && ['Tier', r.exhibitor_tier],
                          ['Days', [r.day1 && 'Day 1', r.day2 && 'Day 2', r.day3 && 'Day 3'].filter(Boolean).join(', ') || 'All'],
                        ].filter(Boolean).map(([label, value]) => (
                          <div key={label} className="bg-background rounded-lg px-3 py-2">
                            <p className="text-muted-foreground uppercase tracking-wide text-[10px]">{label}</p>
                            <p className="font-semibold mt-0.5 truncate">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Status control */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">Update status:</span>
                        <div className="flex gap-2 flex-wrap">
                          {STATUSES.map(s => (
                            <button key={s}
                              onClick={() => updateStatus.mutate({ id: r.id, status: s })}
                              disabled={r.status === s || updateStatus.isPending}
                              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 ${
                                r.status === s
                                  ? STATUS_STYLES[s]
                                  : 'border border-border hover:bg-muted'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
