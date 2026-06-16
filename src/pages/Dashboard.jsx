import { useQuery } from '@tanstack/react-query';
import { Exhibitor, MeetingRequest, Announcement } from '@/api/entities';
import { Users, Calendar, QrCode, BarChart2, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors'], queryFn: () => Exhibitor.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: announcements = [] } = useQuery({ queryKey: ['announcements'], queryFn: () => Announcement.list() });

  const tierCounts = ['Diamond', 'Gold', 'Chrome', 'Copper'].map(t => ({
    name: t,
    count: exhibitors.filter(e => e.tier === t).length,
    color: { Diamond: '#3b82f6', Gold: '#eab308', Chrome: '#94a3b8', Copper: '#f97316' }[t],
  }));

  const catCounts = ['Equipment', 'Services', 'Suppliers', 'Solutions'].map(c => ({
    name: c,
    count: exhibitors.filter(e => e.category === c).length,
  }));

  const pendingMeetings = meetings.filter(m => m.status === 'Pending').length;
  const confirmedMeetings = meetings.filter(m => m.status === 'Confirmed').length;

  const statCards = [
    { label: 'Total Exhibitors', value: exhibitors.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Meeting Requests', value: meetings.length || 0, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Announcements', value: announcements.length || 0, icon: BarChart2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'QR Scans (Demo)', value: 284, icon: QrCode, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">MineCon 2026 — Organiser Overview</p>
        </div>
        <div className="bg-amber/10 border border-amber/30 text-amber text-xs font-bold px-2.5 py-1.5 rounded-lg">DEMO</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className={`font-heading text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Meeting status */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="font-heading text-base font-bold uppercase tracking-wide mb-3">Meeting Status</h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatusPill icon={Clock} label="Pending" count={pendingMeetings} color="text-amber-600 bg-amber-50 dark:bg-amber-900/20" />
          <StatusPill icon={CheckCircle} label="Confirmed" count={confirmedMeetings} color="text-green-600 bg-green-50 dark:bg-green-900/20" />
          <StatusPill icon={XCircle} label="Cancelled" count={meetings.filter(m => m.status === 'Cancelled').length} color="text-red-600 bg-red-50 dark:bg-red-900/20" />
        </div>
      </div>

      {/* Exhibitors by tier */}
      {exhibitors.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h2 className="font-heading text-base font-bold uppercase tracking-wide mb-3">Exhibitors by Tier</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={tierCounts} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tierCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exhibitors by category */}
      {exhibitors.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h2 className="font-heading text-base font-bold uppercase tracking-wide mb-3">Exhibitors by Category</h2>
          <div className="space-y-2.5">
            {catCounts.map(c => {
              const pct = exhibitors.length > 0 ? Math.round((c.count / exhibitors.length) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Demo metrics */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-heading text-base font-bold uppercase tracking-wide">App Engagement</h2>
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-bold">DEMO DATA</span>
        </div>
        <div className="space-y-2.5">
          {[
            { label: 'App Visits', value: '1,248', trend: '+12%' },
            { label: 'QR Code Scans', value: '284', trend: '+8%' },
            { label: 'Exhibitor Profile Views', value: '673', trend: '+23%' },
            { label: 'Site Plan Views', value: '415', trend: '+5%' },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{m.value}</span>
                <span className="text-xs text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{m.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ icon: Icon, label, count, color }) {
  return (
    <div className={`rounded-xl p-3 ${color.split(' ').slice(1).join(' ')} flex flex-col items-center`}>
      <Icon className={`w-5 h-5 ${color.split(' ')[0]} mb-1`} />
      <p className={`font-heading text-xl font-bold ${color.split(' ')[0]}`}>{count}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
