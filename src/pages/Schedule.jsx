import { useState } from 'react';
import { Clock, MapPin, Star, Users, Mic, Video } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ScheduleContent } from '@/api/entities';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { useAppSettings } from '@/lib/AppSettingsContext';

const typeConfig = {
  keynote: { color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30', icon: Star, label: 'Keynote', dot: 'bg-amber-400' },
  panel: { color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30', icon: Users, label: 'Panel', dot: 'bg-blue-400' },
  session: { color: 'border-purple-400 bg-purple-50 dark:bg-purple-950/30', icon: Mic, label: 'Session', dot: 'bg-purple-400' },
  demo: { color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30', icon: Star, label: 'Demo', dot: 'bg-emerald-400' },
  networking: { color: 'border-pink-400 bg-pink-50 dark:bg-pink-950/30', icon: Users, label: 'Networking', dot: 'bg-pink-400' },
  sponsored: { color: 'border-orange-400 bg-orange-50 dark:bg-orange-950/30', icon: Star, label: 'Sponsored', dot: 'bg-orange-400' },
  exhibition: { color: 'border-slate-300 bg-slate-50 dark:bg-slate-800/30', icon: null, label: 'Exhibition', dot: 'bg-slate-400' },
  break: { color: 'border-slate-200 bg-white dark:bg-slate-900/30', icon: null, label: 'Break', dot: 'bg-slate-300' },
  logistics: { color: 'border-slate-200 bg-white dark:bg-slate-900/30', icon: null, label: '', dot: 'bg-slate-200' },
};

export default function Schedule() {
  const [activeDay, setActiveDay] = useState(null);
  const { settings } = useAppSettings();
  const { data, isLoading } = useQuery({
    queryKey: ['schedule-content'],
    queryFn: () => ScheduleContent.get(),
    staleTime: 60_000,
  });

  if (!settings.showSchedule) {
    return (
      <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto text-center text-muted-foreground">
        <p className="mt-10">The Event Schedule isn't available right now.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto text-muted-foreground text-sm">Loading…</div>;
  }

  const days = data.days || [];
  const day = days.find(d => d.id === activeDay) || days[0];
  if (!day) {
    return (
      <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto text-center text-muted-foreground">
        <p className="mt-10">No schedule has been published yet.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl lg:max-w-4xl mx-auto">
      <div className="px-4 pt-5 mb-4">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Event Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">{EVENT_CONFIG.eventFullName}</p>
      </div>

      {/* Day tabs */}
      <div className="px-4 mb-5">
        <div className="lg:flex lg:items-center lg:gap-4">
          <div className="bg-muted rounded-xl p-1 flex gap-1 lg:flex-shrink-0">
            {days.map(d => (
              <button
                key={d.id}
                onClick={() => setActiveDay(d.id)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${day.id === d.id ? 'bg-steel text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="mt-2 lg:mt-0 px-1 flex items-center justify-between lg:flex-1">
            <p className="text-xs text-amber font-semibold">{day.theme}</p>
            <p className="text-xs text-muted-foreground">{day.date}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 mb-4 flex gap-3 flex-wrap">
        {['keynote', 'panel', 'session', 'demo', 'networking'].map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${typeConfig[t].dot}`} />
            <span className="text-xs text-muted-foreground capitalize">{typeConfig[t].label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="px-4 space-y-2.5">
        {(day.sessions || []).map((s, i) => {
          const cfg = typeConfig[s.type] || typeConfig.logistics;
          const Icon = cfg.icon;
          return (
            <div key={s.id || i} className={`flex gap-3 items-start p-3.5 rounded-xl border-l-4 ${cfg.color}`}>
              <div className="flex-shrink-0 text-right w-10">
                <p className="text-xs font-bold text-foreground">{s.time}</p>
                {s.duration && <p className="text-[10px] text-muted-foreground">{s.duration}</p>}
              </div>
              <div className={`w-px self-stretch ${cfg.dot} opacity-40`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {Icon && <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-foreground/60" />}
                  <p className="text-sm font-semibold text-foreground leading-snug">{s.title}</p>
                </div>
                {s.speaker && <p className="text-xs text-muted-foreground mt-0.5 pl-5">{s.speaker}</p>}
                <div className="flex items-center gap-1 mt-1 pl-5">
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{s.location}</p>
                </div>
                {s.virtual && s.webinar_url && (
                  <a
                    href={s.webinar_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 ml-5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                  >
                    <Video className="w-3 h-3" /> Join Online
                  </a>
                )}
              </div>
              {cfg.label && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.dot} text-white flex-shrink-0`}>{cfg.label}</span>}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="px-4 mt-6">
        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">📅 {EVENT_CONFIG.eventFullName}</p>
          <p>The schedule is indicative. Session times, speakers, and venues are subject to change. Check this app for real-time updates closer to the event.</p>
        </div>
      </div>
    </div>
  );
}
