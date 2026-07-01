import { useQuery } from '@tanstack/react-query';
import { Announcement } from '@/api/entities';
import { Megaphone, AlertCircle, Clock, Bell, Pin, Sparkles, MapPin, Navigation } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const typeIcon = { Important: AlertCircle, Reminder: Clock, General: Megaphone, Update: Bell, Venue: MapPin, Directional: Navigation };
const typeColor = {
  Important:   'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600',
  Reminder:    'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-600',
  General:     'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-600',
  Update:      'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600',
  Venue:       'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-600',
  Directional: 'border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-600',
};
const typeBadge = {
  Important:   'bg-red-100 text-red-700',
  Reminder:    'bg-amber-100 text-amber-700',
  General:     'bg-blue-100 text-blue-700',
  Update:      'bg-emerald-100 text-emerald-700',
  Venue:       'bg-violet-100 text-violet-700',
  Directional: 'bg-teal-100 text-teal-700',
};

export default function Announcements() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });

  const sponsored = announcements.filter(a => a.sponsored && !a.pinned);
  const pinned = announcements.filter(a => a.pinned);
  const rest = announcements.filter(a => !a.pinned && !a.sponsored);

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Event Updates</h1>
      <p className="text-muted-foreground text-sm mb-5">Important notices, reminders, and announcements from the {EVENT_CONFIG.eventName} organising team.</p>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>}

      {!isLoading && announcements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No announcements yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Event updates and organiser notices will appear here. Check back closer to the event.</p>
        </div>
      )}

      {pinned.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-3.5 h-3.5 text-amber" />
            <p className="text-xs font-bold uppercase tracking-wide text-amber">Pinned Notices</p>
          </div>
          <div className="space-y-3">
            {pinned.map(a => <AnnouncementCard key={a.id} a={a} pinned />)}
          </div>
        </div>
      )}

      {sponsored.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber" />
            <p className="text-xs font-bold uppercase tracking-wide text-amber">Sponsored</p>
          </div>
          <div className="space-y-3">
            {sponsored.map(a => <AnnouncementCard key={a.id} a={a} sponsored />)}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">All Updates</p>
          <div className="space-y-3">
            {rest.map(a => <AnnouncementCard key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ a, pinned, sponsored }) {
  const Icon = typeIcon[a.type] || Megaphone;
  const color = typeColor[a.type] || typeColor.General;
  const badge = typeBadge[a.type] || typeBadge.General;
  const borderClass = sponsored
    ? 'border-l-4 border-l-amber-400 border border-amber/30 bg-amber-50/50 dark:bg-amber-950/10'
    : `border-l-4 ${color.replace('text-', '')} bg-card border border-border`;
  return (
    <div className={`rounded-xl p-4 ${borderClass}`}>
      <div className="flex items-start gap-3">
        {sponsored ? <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber" /> : <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 opacity-70" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 justify-between">
            <p className="font-semibold text-sm text-foreground leading-snug">{a.title}</p>
            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
              {pinned && <span className="text-[10px] bg-amber/20 text-amber px-1.5 py-0.5 rounded font-bold">PINNED</span>}
              {sponsored && (
                <span className="text-[10px] bg-amber/20 text-amber px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> {a.sponsor_name || 'Sponsored'}
                </span>
              )}
              {!sponsored && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${badge}`}>{a.type || 'General'}</span>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a.body}</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            {a.created_date ? new Date(a.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
