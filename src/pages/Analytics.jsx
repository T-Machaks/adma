import { useQuery } from '@tanstack/react-query';
import { Registration, MeetingRequest, Exhibitor, Announcement } from '@/api/entities';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Users, Calendar, QrCode, Eye, MousePointer, BookOpen, Smartphone, CheckSquare } from 'lucide-react';

const ENGAGEMENT_DATA = [
  { day: 'Day 1', visits: 1248, qr: 284, meetings: 47 },
  { day: 'Day 2', visits: 1520, qr: 391, meetings: 63 },
  { day: 'Day 3', visits: 986, qr: 219, meetings: 38 },
];

const CHECKIN_DATA = [
  { time: '07:30', count: 12 }, { time: '08:00', count: 87 }, { time: '09:00', count: 243 },
  { time: '10:00', count: 189 }, { time: '11:00', count: 134 }, { time: '12:00', count: 76 },
  { time: '13:00', count: 58 }, { time: '14:00', count: 112 }, { time: '15:00', count: 98 },
  { time: '16:00', count: 67 }, { time: '17:00', count: 34 },
];

const CATEGORY_DATA = [
  { name: 'Equipment', value: 38, fill: '#f59e0b' },
  { name: 'Services', value: 24, fill: '#3b82f6' },
  { name: 'Suppliers', value: 22, fill: '#10b981' },
  { name: 'Solutions', value: 16, fill: '#8b5cf6' },
];

export default function Analytics() {
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => Registration.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors'], queryFn: () => Exhibitor.list() });
  const { data: announcements = [] } = useQuery({ queryKey: ['announcements'], queryFn: () => Announcement.list() });

  const totalReg = registrations.length;
  const checkedIn = registrations.filter(r => r.status === 'Checked In').length;
  const confirmed = registrations.filter(r => r.status === 'Confirmed').length;

  const statCards = [
    { label: 'Total Registrations', value: totalReg || 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', trend: '+14%' },
    { label: 'Check-Ins', value: checkedIn || 0, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', trend: '+8%' },
    { label: 'Meeting Requests', value: meetings.length || 0, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', trend: '+23%' },
    { label: 'Exhibitor Views', value: 673, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', trend: '+18%' },
    { label: 'QR Scans', value: 894, icon: QrCode, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20', trend: '+31%' },
    { label: 'Sponsor Clicks', value: 412, icon: MousePointer, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', trend: '+9%' },
    { label: 'Magazine Views', value: 1147, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', trend: '+42%' },
    { label: 'App Visits', value: 3754, icon: Smartphone, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50', trend: '+12%' },
  ];

  const regByType = ['Attendee', 'Exhibitor', 'Sponsor', 'Speaker', 'VIP Guest'].map(t => ({
    name: t, count: registrations.filter(r => r.role_type === t).length,
  }));

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Analytics</h1>
          <p className="text-muted-foreground text-sm">MineCon 2026 — Event performance overview</p>
        </div>
        <div className="bg-amber/10 border border-amber/30 text-amber text-xs font-bold px-2.5 py-1.5 rounded-lg">DEMO DATA</div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className="text-xs text-emerald-600 flex items-center gap-0.5 font-medium"><TrendingUp className="w-3 h-3" />{s.trend}</span>
              </div>
              <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row — side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Engagement Over Event Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ENGAGEMENT_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="visits" name="App Visits" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="qr" name="QR Scans" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="meetings" name="Meetings" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Check-in Trend — Day 1</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CHECKIN_DATA} margin={{ top: 0, right: 0, bottom: 0, left: -25 }}>
              <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} name="Check-ins" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Registrations by type */}
      {registrations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Registrations by Type</p>
          <div className="space-y-2">
            {regByType.map(r => {
              const pct = totalReg > 0 ? Math.round((r.count / totalReg) * 100) : 0;
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exhibitor categories */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Exhibitor Views by Category</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={CATEGORY_DATA} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {CATEGORY_DATA.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Quick metrics */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Quick Metrics</p>
        <div className="space-y-2.5">
          {[
            { label: 'Avg. sessions per attendee', value: '3.2' },
            { label: 'Avg. exhibitor profile views', value: '22.4' },
            { label: 'Meeting conversion rate', value: '68%' },
            { label: 'QR scan-to-download rate', value: '44%' },
            { label: 'Magazine completion rate', value: '31%' },
            { label: 'Sponsor click-through rate', value: '11%' },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{m.label}</span>
              <span className="text-sm font-bold text-amber">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
