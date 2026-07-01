import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, MeetingRequest, Announcement, VirtualEnquiry } from '@/api/entities';
import { Users, Calendar, QrCode, BarChart2, CheckCircle, Clock, XCircle, Globe, ToggleLeft, ToggleRight, MessageSquare, Megaphone, AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const VALID_SECTIONS = EVENT_CONFIG.exhibitorSections;
const TIER_COLORS = { Platinum: '#16a34a', Gold: '#eab308', Silver: '#94a3b8', Bronze: '#92400e' };

export default function Dashboard() {
  const { user } = useAuth();
  const isPartner = user?.role === 'marketing_partner';

  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors'], queryFn: () => Exhibitor.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: announcements = [] } = useQuery({ queryKey: ['announcements'], queryFn: () => Announcement.list() });
  const { data: enquiries = [] } = useQuery({ queryKey: ['virtual-enquiries'], queryFn: () => VirtualEnquiry.list('-created_date') });
  const { settings, updateSettings } = useAppSettings();
  const [toggling, setToggling] = useState(false);

  async function handleVirtualToggle() {
    setToggling(true);
    await updateSettings({ virtualExhibitionOpen: !settings.virtualExhibitionOpen });
    setToggling(false);
  }

  const tierCounts = EVENT_CONFIG.exhibitorTiers.map(t => ({
    name: t,
    count: exhibitors.filter(e => e.tier === t).length,
    color: TIER_COLORS[t] || '#94a3b8',
  }));

  const catCounts = EVENT_CONFIG.exhibitorCategories.map(c => ({
    name: c,
    count: exhibitors.filter(e => e.category === c).length,
  }));

  const pendingMeetings = meetings.filter(m => m.status === 'Pending').length;
  const confirmedMeetings = meetings.filter(m => m.status === 'Confirmed').length;

  const sanityIssues = useMemo(() => {
    const noLogo = exhibitors.filter(e => !e.logo_url);
    const noDesc = exhibitors.filter(e => !e.description?.trim());
    const noBooth = exhibitors.filter(e => !e.booth?.trim());
    const badSection = exhibitors.filter(e => e.section && !VALID_SECTIONS.includes(e.section));

    const boothGroups = {};
    exhibitors.forEach(e => { if (e.booth) { boothGroups[e.booth] = boothGroups[e.booth] || []; boothGroups[e.booth].push(e.name); } });
    const dupBooths = Object.entries(boothGroups).filter(([, ns]) => ns.length > 1);

    const noAnnoBody = announcements.filter(a => !a.body?.trim());

    const exhibitorIds = new Set(exhibitors.map(e => e.id));
    const orphanMeetings = meetings.filter(m => m.exhibitor_id && !exhibitorIds.has(m.exhibitor_id));

    return [
      noLogo.length     && { label: 'Exhibitors missing logo',          count: noLogo.length,      items: noLogo.map(e => e.name) },
      noDesc.length     && { label: 'Exhibitors missing description',   count: noDesc.length,      items: noDesc.map(e => e.name) },
      noBooth.length    && { label: 'Exhibitors missing booth number',  count: noBooth.length,     items: noBooth.map(e => e.name) },
      badSection.length && { label: 'Exhibitors with invalid section',  count: badSection.length,  items: badSection.map(e => `${e.name} (${e.section})`) },
      dupBooths.length  && { label: 'Duplicate booth numbers',          count: dupBooths.length,   items: dupBooths.map(([b, ns]) => `${b}: ${ns.join(', ')}`) },
      noAnnoBody.length && { label: 'Announcements missing body text',  count: noAnnoBody.length,  items: noAnnoBody.map(a => a.title || a.id) },
      orphanMeetings.length && { label: 'Meetings with missing exhibitor', count: orphanMeetings.length, items: orphanMeetings.map(m => m.id) },
    ].filter(Boolean);
  }, [exhibitors, meetings, announcements]);

  const statCards = [
    { label: 'Total Exhibitors',  value: exhibitors.length || 0,   icon: Users,          color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',    path: '/console/analytics' },
    { label: 'Meeting Requests',  value: meetings.length || 0,     icon: Calendar,       color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',  path: '/console/analytics' },
    { label: 'Info Enquiries',    value: enquiries.length || 0,    icon: MessageSquare,  color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-900/20', path: '/console/analytics' },
    { label: 'Announcements',     value: announcements.length || 0, icon: BarChart2,     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', path: isPartner ? null : '/console/communications' },
  ];

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">
            {isPartner ? 'Marketing Dashboard' : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back, <span className="text-foreground font-medium">{user?.full_name || 'Console User'}</span>
            {' '}— {isPartner ? 'Marketing Partner' : 'Organizer'}
          </p>
        </div>
      </div>

      {/* Marketing Partner quick-access panel */}
      {isPartner && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Link to="/console/marketing"
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-amber/50 transition-colors">
            <div className="w-9 h-9 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Marketing Hub</p>
              <p className="text-xs text-muted-foreground">Ad slots &amp; campaigns</p>
            </div>
          </Link>
          <Link to="/console/analytics"
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-amber/50 transition-colors">
            <div className="w-9 h-9 bg-violet-50 dark:bg-violet-900/20 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Analytics</p>
              <p className="text-xs text-muted-foreground">Traffic &amp; engagement</p>
            </div>
          </Link>
        </div>
      )}

      {/* Virtual Exhibition control — organizers only */}
      {!isPartner && (
      <div className={`rounded-xl border p-4 mb-5 ${settings.virtualExhibitionOpen ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700' : 'bg-card border-border'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${settings.virtualExhibitionOpen ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted'}`}>
              <Globe className={`w-5 h-5 ${settings.virtualExhibitionOpen ? 'text-emerald-600' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">Virtual Exhibition</p>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                {settings.virtualExhibitionOpen
                  ? 'Open — attendees can browse virtual booths and submit enquiries'
                  : 'Closed — virtual features hidden from attendees'}
              </p>
            </div>
          </div>
          <button
            onClick={handleVirtualToggle}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 active:scale-95 ${
              settings.virtualExhibitionOpen
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-steel hover:bg-steel/90 text-white'
            } disabled:opacity-60`}
          >
            {settings.virtualExhibitionOpen
              ? <><ToggleRight className="w-4 h-4" /> Open</>
              : <><ToggleLeft className="w-4 h-4" /> Closed</>}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 sm:hidden">
          {settings.virtualExhibitionOpen
            ? 'Open — attendees can browse virtual booths and submit enquiries'
            : 'Closed — virtual features hidden from attendees'}
        </p>
      </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => {
          const Icon = s.icon;
          const inner = (
            <>
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className={`font-heading text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </>
          );
          const base = 'bg-card border border-border rounded-xl p-4';
          return s.path
            ? <Link key={s.label} to={s.path} className={`${base} block hover:border-amber/50 transition-colors`}>{inner}</Link>
            : <div key={s.label} className={base}>{inner}</div>;
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

      {/* Sanity check — organizers only */}
      {!isPartner && <SanityCheck issues={sanityIssues} />}

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

    </div>
  );
}

function SanityCheck({ issues }) {
  const [open, setOpen] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(null);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          <span className="font-heading text-sm font-bold uppercase tracking-wide">Sanity Check</span>
          {issues.length > 0
            ? <span className="text-[10px] font-bold bg-amber/10 text-amber px-1.5 py-0.5 rounded">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
            : <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-1.5 py-0.5 rounded">All clear</span>
          }
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          {issues.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">No data issues found — all checks passed.</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {issues.map((issue, i) => (
                <div key={i}>
                  <button
                    onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0" />
                    <span className="text-sm flex-1">{issue.label}</span>
                    <span className="text-xs font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded mr-1">{issue.count}</span>
                    {expandedIdx === i
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {expandedIdx === i && (
                    <ul className="px-4 pb-3 pl-11 space-y-0.5">
                      {issue.items.slice(0, 12).map((item, j) => (
                        <li key={j} className="text-xs text-muted-foreground">• {item}</li>
                      ))}
                      {issue.items.length > 12 && (
                        <li className="text-xs text-muted-foreground">+ {issue.items.length - 12} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
