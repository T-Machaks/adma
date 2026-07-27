import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Exhibitor, MeetingRequest, EngagementEvent, AdSlot } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { useAuth } from '@/lib/AuthContext';
import {
  Eye, Calendar, Megaphone, TrendingUp,
  MousePointerClick, Star, BarChart2, QrCode, UserCheck,
  Download, Lock, Users, X, ArrowRight, BookOpen, Play,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AdBannerPreview from '@/components/exhibitor/AdBannerPreview';
import { getStandTier, standTierAtLeast } from '@/lib/standTiers';

const TYPE_LABEL = {
  profile_view:   'Booth Visit',
  meeting_click:  'Meeting Click',
  ad_click:       'Ad Click',
  featured_click: 'Featured Tap',
  qr_scan:        'Visitor QR Scan',
  booth_scan:     'Exhibitor Scan',
};

const SOURCE_LABEL = {
  directory:      'Exhibitor Directory',
  home_featured:  'Home — Featured',
  home_carousel:  'Home — Ad Banner',
  magazine:       'Digital Magazine',
  connect_hub:    'Connect Hub',
  sponsors:       'Sponsors Page',
  visitor_scan:   'Visitor Scanned Booth QR',
  exhibitor_scan: 'Exhibitor Scanned Visitor',
};

const TYPE_ICON = {
  profile_view:   Eye,
  meeting_click:  Calendar,
  ad_click:       MousePointerClick,
  featured_click: Star,
  qr_scan:        QrCode,
  booth_scan:     UserCheck,
};

function getLast14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function exportGuideAnalyticsCSV(stats, boothName) {
  const date = new Date().toISOString().slice(0, 10);
  const rows = [
    ['Ad Clicks (Exhibition Guide)', stats.adClicks],
    ['Carousel Slide Views', stats.carouselViews],
    ['Video Plays', stats.videoPlays],
    ['Video Completes', stats.videoCompletes],
    ['Video Completion Rate', stats.videoPlays > 0 ? `${Math.round((stats.videoCompletes / stats.videoPlays) * 100)}%` : '—'],
  ];
  const csv = [['Metric', 'Count'], ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boothName.replace(/\s+/g, '_')}_guide_analytics_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportLeadsCSV(leads, boothName) {
  const header = ['Name', 'Email', 'Company', 'Message', 'Preferred Time', 'Status', 'Date'];
  const rows = leads.map(m => [
    m.attendee_name || m.full_name || '',
    m.attendee_email || '',
    m.company || '',
    (m.message || '').replace(/,/g, ' '),
    m.preferred_time || '',
    m.status || '',
    m.created_date ? new Date(m.created_date).toLocaleDateString('en-GB') : '',
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${boothName.replace(/\s+/g, '_')}_leads.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExhibitorAnalytics() {
  const { user } = useAuth();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(null),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  const { data: events = [] } = useQuery({
    queryKey: ['engagements', myBooth?.id],
    enabled: !!myBooth,
    queryFn: () =>
      EngagementEvent.filterByExhibitor(myBooth.id, myBooth.name),
  });

  const { data: allMeetings = [] } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const { data: activeAdSlots = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
  });

  if (!myBooth) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">No booth linked to your account.</p>
      </div>
    );
  }

  const hasAnalytics = standTierAtLeast(myBooth, 'Enhanced');

  if (!hasAnalytics) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-amber" />
        </div>
        <h1 className="font-heading text-xl font-bold mb-2">Analytics is an Enhanced package feature</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          You're currently on the <strong>Basic</strong> package. Upgrade to Enhanced or above to unlock booth analytics, live chat with attendees, and your full profile.
        </p>
        <a
          href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Booth%20Upgrade%20Enquiry`}
          className="inline-flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150"
        >
          Enquire to Upgrade <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const myMeetings = allMeetings.filter(
    m => m.exhibitor_id === myBooth.id || m.company === myBooth.name
  );

  // KPI totals
  const profileViews    = events.filter(e => e.type === 'profile_view').length;
  const meetingClicks   = events.filter(e => e.type === 'meeting_click').length;
  const featuredTaps    = events.filter(e => e.type === 'featured_click').length;
  const adClicks        = events.filter(e => e.type === 'ad_click').length;
  const qrScans         = events.filter(e => e.type === 'qr_scan' || e.type === 'booth_scan').length;
  const totalEngaged    = events.length;
  const meetingRequests = myMeetings.length;
  const confirmed       = myMeetings.filter(m => m.status === 'Confirmed').length;

  // 14-day trend
  const days = getLast14Days();
  const byDay = Object.fromEntries(days.map(d => [d, 0]));
  events.forEach(e => {
    const day = e.created_date?.slice(0, 10);
    if (day && byDay[day] !== undefined) byDay[day]++;
  });
  const dayCounts = days.map(d => byDay[d]);
  const maxDay = Math.max(...dayCounts, 1);

  // Source breakdown
  const sourceCounts = {};
  events.forEach(e => {
    sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
  });
  const sourceSorted = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  const maxSource = sourceSorted[0]?.[1] || 1;

  // Type breakdown
  const typeCounts = {};
  events.forEach(e => {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  });

  // Recent events (last 10)
  const recent = [...events]
    .sort((a, b) => b.created_date?.localeCompare(a.created_date ?? '') ?? 0)
    .slice(0, 10);

  // Exhibition Guide derived stats
  const guideAdClicks       = events.filter(e => e.source === 'magazine' && e.type === 'ad_click').length;
  const guideVideoPlays     = events.filter(e => e.source === 'magazine' && e.type === 'video_play').length;
  const guideVideoCompletes = events.filter(e => e.source === 'magazine' && e.type === 'video_complete').length;
  const guideCarouselViews  = events.filter(e => e.source === 'magazine' && e.type === 'carousel_view').length;
  const hasGuideActivity    = guideAdClicks + guideVideoPlays + guideCarouselViews > 0;
  const guideStats = { adClicks: guideAdClicks, videoPlays: guideVideoPlays, videoCompletes: guideVideoCompletes, carouselViews: guideCarouselViews };

  const hasLeadExport = getStandTier(myBooth) === 'Premium';
  const isPremiumPkg = myBooth?.package === 'Premium';
  const myAd = activeAdSlots.find(a => a.exhibitor_id === myBooth.id) ?? null;
  const carouselAdClicks = events.filter(e => e.type === 'ad_click' && e.source === 'home_carousel').length;

  const kpis = [
    { label: 'Booth Views',      value: profileViews,             icon: Eye,               color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'QR Scans',         value: qrScans,                  icon: QrCode,            color: 'text-amber',       bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Meeting Requests', value: meetingRequests,          icon: Calendar,          color: 'text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { label: 'Ad & Feature Hits',value: adClicks + featuredTaps,  icon: MousePointerClick, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1 min-w-0">
          {myBooth.logo_url && (
            <div className="w-8 h-8 bg-white border border-border rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src={myBooth.logo_url} alt={myBooth.name} className="w-7 h-7 object-contain" />
            </div>
          )}
          <h1 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-wide truncate min-w-0">{myBooth.name}</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Engagement analytics · Booth {myBooth.booth} · {myBooth.section}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-border p-4`}>
            <div className={`${color} mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="font-heading text-3xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* 14-day trend */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber" /> Engagement — Last 14 Days
        </h2>
        {totalEngaged === 0 ? (
          <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
            No engagement data yet. Tracking begins as attendees interact with your booth.
          </div>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {days.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-t-sm bg-amber/80 hover:bg-amber transition-all duration-150 min-h-[2px]"
                  style={{ height: `${(dayCounts[i] / maxDay) * 80}px` }}
                  title={`${dayLabel(day)}: ${dayCounts[i]} engagements`}
                />
                {i % 3 === 1 && (
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    {dayLabel(day)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Engagement by source */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber" /> By Source
          </h2>
          {sourceSorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {sourceSorted.map(([source, count]) => (
                <div key={source}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground/80 font-medium">
                      {SOURCE_LABEL[source] ?? source}
                    </span>
                    <span className="font-bold tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber rounded-full transition-all duration-300"
                      style={{ width: `${(count / maxSource) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engagement by type */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber" /> By Type
          </h2>
          {Object.keys(typeCounts).length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const Icon = TYPE_ICON[type] ?? Eye;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{TYPE_LABEL[type] ?? type}</span>
                          <span className="font-bold tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-steel rounded-full"
                            style={{ width: `${(count / (totalEngaged || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Ad Banner Performance */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber" />
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Ad Banner Performance</h2>
        </div>
        {isPremiumPkg && myAd ? (
          <div className="p-5 space-y-4">
            <AdBannerPreview ad={myAd} />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Carousel Clicks</span>
                </div>
                <div className="font-heading text-3xl font-bold">{carouselAdClicks}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">attendees clicked your ad</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Total Ad Events</span>
                </div>
                <div className="font-heading text-3xl font-bold">{adClicks}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">across all surfaces</div>
              </div>
            </div>
          </div>
        ) : isPremiumPkg ? (
          <div className="p-8 text-center text-muted-foreground">
            <Megaphone className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">No ad configured</p>
            <p className="text-xs mt-1">Contact the organiser to set up your carousel slot.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex flex-col items-center justify-center z-10 gap-3 rounded-b-xl">
              <div className="w-10 h-10 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber" />
              </div>
              <div className="text-center px-6">
                <p className="font-heading font-bold text-sm">Premium Feature</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Upgrade to Premium to get a carousel ad slot and track click performance.
                </p>
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150"
              >
                Upgrade Booth <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="w-full h-24 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-xl border border-border p-4 h-20" />
                <div className="bg-muted/40 rounded-xl border border-border p-4 h-20" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exhibition Guide Performance */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber" />
            <div>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Exhibition Guide</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Engagement from the digital guide</p>
            </div>
          </div>
          <button
            onClick={() => exportGuideAnalyticsCSV(guideStats, myBooth.name)}
            disabled={!hasGuideActivity}
            className="flex items-center gap-1.5 text-xs border border-border text-foreground/70 font-semibold px-3 py-2 rounded-lg hover:bg-muted active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
        {hasGuideActivity ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Ad Clicks</span>
                </div>
                <div className="font-heading text-2xl font-bold">{guideAdClicks}</div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[10px] text-muted-foreground">Carousel Views</span>
                </div>
                <div className="font-heading text-2xl font-bold">{guideCarouselViews}</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-border p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Play className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">Video Plays</span>
                </div>
                <div className="font-heading text-2xl font-bold">{guideVideoPlays}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber" />
                  <span className="text-[10px] text-muted-foreground">Video Complete</span>
                </div>
                <div className="font-heading text-2xl font-bold">{guideVideoCompletes}</div>
                {guideVideoPlays > 0 && (
                  <>
                    <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-amber rounded-full"
                        style={{ width: `${(guideVideoCompletes / guideVideoPlays) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {Math.round((guideVideoCompletes / guideVideoPlays) * 100)}% completion
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No guide engagement yet.</p>
            <p className="text-xs mt-1">Clicks and views from your Exhibition Guide pages will appear here.</p>
          </div>
        )}
      </div>

      {/* Meeting requests breakdown */}
      {myMeetings.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber" /> Meeting Requests
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending',   count: myMeetings.filter(m => m.status === 'Pending').length,   cls: 'text-amber' },
              { label: 'Confirmed', count: myMeetings.filter(m => m.status === 'Confirmed').length, cls: 'text-emerald-500' },
              { label: 'Declined',  count: myMeetings.filter(m => m.status === 'Declined').length,  cls: 'text-red-500' },
            ].map(({ label, count, cls }) => (
              <div key={label} className="text-center bg-muted/40 rounded-xl p-3">
                <div className={`font-heading text-2xl font-bold ${cls}`}>{count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-4">
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Engagement activity will appear here as attendees interact with your exhibitor profile, ads, and meeting requests.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(ev => {
              const Icon = TYPE_ICON[ev.type] ?? Eye;
              const ts = ev.created_date
                ? new Date(ev.created_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-amber/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{TYPE_LABEL[ev.type] ?? ev.type}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{SOURCE_LABEL[ev.source] ?? ev.source}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">{ts}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">{ts}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead Export */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber" />
            <div>
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Lead Export</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Meeting request contacts · {myMeetings.length} lead{myMeetings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {hasLeadExport ? (
            <button
              onClick={() => exportLeadsCSV(myMeetings, myBooth.name)}
              disabled={myMeetings.length === 0}
              className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-3 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          ) : (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="flex items-center gap-1.5 text-xs border border-amber/40 text-amber font-semibold px-3 py-2 rounded-lg hover:bg-amber/10 active:scale-95 transition-all duration-150"
            >
              <Lock className="w-3.5 h-3.5" /> Unlock
            </button>
          )}
        </div>

        <div className="relative">
          {!hasLeadExport && (
            <div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex flex-col items-center justify-center z-10 gap-3 rounded-b-xl">
              <div className="w-10 h-10 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber" />
              </div>
              <div className="text-center px-6">
                <p className="font-heading font-bold text-sm">Premium Package Feature</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">Upgrade to Premium to export full lead contact data and unlock attendee details.</p>
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150"
              >
                Upgrade Booth <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {myMeetings.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No meeting requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {myMeetings.slice(0, 8).map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.attendee_name || m.full_name || 'Attendee'}</td>
                      <td className={`px-3 py-3 text-muted-foreground ${!hasLeadExport ? 'blur-[4px] select-none' : ''}`}>
                        {m.attendee_email || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${
                          m.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          m.status === 'Declined'  ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{m.status}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {m.created_date ? new Date(m.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {myMeetings.length > 8 && (
                <p className="px-5 py-2.5 text-xs text-muted-foreground border-t border-border">
                  +{myMeetings.length - 8} more leads — export CSV for full list
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Package Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wide">Upgrade Your Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              You're currently on the <strong>{getStandTier(myBooth)}</strong> package. Upgrade to <strong>Premium</strong> for lead export and an AI-referenceable profile.
            </p>
            <div className="space-y-2">
              {[
                { pkg: 'Enhanced', color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20', perks: ['Full profile, chat & analytics', 'Gallery of 6 scrolling images', 'Meeting request boost'] },
                { pkg: 'Premium', color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20', perks: ['AI-referenceable profile', 'Lead capture form & CSV export', 'Home page featured listing', 'Ad banner carousel slot'] },
              ].map(({ pkg, color, perks }) => (
                <div key={pkg} className={`border rounded-xl p-4 ${color}`}>
                  <p className="font-heading font-bold text-sm mb-2">{pkg}</p>
                  <ul className="space-y-1">
                    {perks.map(p => (
                      <li key={p} className="text-xs text-foreground/80 flex items-center gap-1.5">
                        <span className="text-amber font-bold">·</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <a
              href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Booth%20Package%20Upgrade%20Enquiry`}
              className="flex items-center justify-center gap-2 w-full bg-amber text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-amber/90 active:scale-95 transition-all duration-150"
              onClick={() => setUpgradeOpen(false)}
            >
              Enquire to Upgrade <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
