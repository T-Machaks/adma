import { useQuery } from '@tanstack/react-query';
import { Registration, MeetingRequest, Exhibitor, EngagementEvent } from '@/api/entities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Users, Calendar, QrCode, Eye, MousePointerClick, BookOpen, CheckSquare, CalendarCheck } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const CATEGORY_COLORS = ['#f59e0b', '#16a34a', '#92400e', '#3b82f6', '#8b5cf6', '#0d9488', '#ec4899', '#f97316', '#64748b'];

function getLastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function pct(numerator, denominator) {
  if (!denominator) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function Analytics() {
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => Registration.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors'], queryFn: () => Exhibitor.list() });
  const { data: engagements = [] } = useQuery({ queryKey: ['engagements-all'], queryFn: () => EngagementEvent.list() });

  const totalReg = registrations.length;
  const checkedIn = registrations.filter(r => r.status === 'Checked In' || r.checked_in).length;
  const confirmedMeetings = meetings.filter(m => m.status === 'Confirmed').length;

  const profileViews = engagements.filter(e => e.type === 'profile_view').length;
  const qrScans = engagements.filter(e => e.type === 'qr_scan' || e.type === 'booth_scan').length;
  const adFeatureClicks = engagements.filter(e => e.type === 'ad_click' || e.type === 'featured_click').length;
  const magazineEvents = engagements.filter(e => e.source === 'magazine');

  const statCards = [
    { label: 'Total Registrations', value: totalReg, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Check-Ins', value: checkedIn, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Meeting Requests', value: meetings.length, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Confirmed Meetings', value: confirmedMeetings, icon: CalendarCheck, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { label: 'Exhibitor Views', value: profileViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'QR Scans', value: qrScans, icon: QrCode, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { label: 'Ad & Feature Clicks', value: adFeatureClicks, icon: MousePointerClick, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Magazine Engagement', value: magazineEvents.length, icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
  ];

  const regByType = ['Attendee', 'Exhibitor', 'Sponsor', 'Speaker', 'VIP Guest'].map(t => ({
    name: t, count: registrations.filter(r => r.role_type === t).length,
  }));

  // Real 14-day trend across check-ins, meetings and engagement events
  const days = getLastNDays(14);
  const trendData = days.map(day => ({
    day: dayLabel(day),
    checkins: registrations.filter(r => r.check_in_time?.slice(0, 10) === day).length,
    meetings: meetings.filter(m => m.created_date?.slice(0, 10) === day).length,
    engagement: engagements.filter(e => e.created_date?.slice(0, 10) === day).length,
  }));
  const hasTrendData = trendData.some(d => d.checkins || d.meetings || d.engagement);

  // Real check-in trend by hour of day
  const checkedInRegs = registrations.filter(r => r.check_in_time);
  const hourCounts = Array.from({ length: 24 }, (_, h) => ({
    time: `${String(h).padStart(2, '0')}:00`,
    count: checkedInRegs.filter(r => new Date(r.check_in_time).getHours() === h).length,
  }));

  // Real exhibitor-views-by-category breakdown
  const exhibitorById = Object.fromEntries(exhibitors.map(e => [e.id, e]));
  const categoryCounts = {};
  engagements
    .filter(e => e.type === 'profile_view')
    .forEach(e => {
      const category = exhibitorById[e.exhibitor_id]?.category;
      if (category) categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  const categoryData = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));

  const guideVideoPlays = engagements.filter(e => e.source === 'magazine' && e.type === 'video_play').length;
  const guideVideoCompletes = engagements.filter(e => e.source === 'magazine' && e.type === 'video_complete').length;

  const quickMetrics = [
    { label: 'Check-in rate', value: pct(checkedIn, totalReg) },
    { label: 'Meeting confirmation rate', value: pct(confirmedMeetings, meetings.length) },
    { label: 'QR scans share of engagement', value: pct(qrScans, engagements.length) },
    { label: 'Magazine video completion rate', value: pct(guideVideoCompletes, guideVideoPlays) },
  ];

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Analytics</h1>
        <p className="text-muted-foreground text-sm">{EVENT_CONFIG.eventFullName} — Event performance overview</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {statCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
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
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Activity — Last 14 Days</p>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="checkins" name="Check-Ins" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="meetings" name="Meetings" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="engagement" name="Engagement Events" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
              No activity recorded in the last 14 days yet.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Check-Ins by Hour of Day</p>
          {checkedInRegs.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourCounts} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Check-ins" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
              No check-ins recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Registrations by type */}
      {registrations.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Registrations by Type</p>
          <div className="space-y-2">
            {regByType.map(r => {
              const rowPct = totalReg > 0 ? Math.round((r.count / totalReg) * 100) : 0;
              return (
                <div key={r.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full" style={{ width: `${rowPct}%` }} />
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
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm">
            No exhibitor profile views recorded yet.
          </div>
        )}
      </div>

      {/* Quick metrics */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="font-heading text-sm font-bold uppercase tracking-wide mb-3">Quick Metrics</p>
        <div className="space-y-2.5">
          {quickMetrics.map(m => (
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
