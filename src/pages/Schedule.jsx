import { useState } from 'react';
import { Clock, MapPin, Star, Users, Mic, Video } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const SCHEDULE = {
  'Day 1': {
    date: '5 June 2026',
    theme: 'Machinery & Mechanisation',
    sessions: [
      { time: '07:30', title: 'Gates Open & Registration', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens — Machinery Hall', location: 'Machinery Hall', type: 'exhibition', duration: 'All Day' },
      { time: '09:00', title: 'Opening Keynote: The Future of Farm Mechanisation in Zimbabwe', location: 'Main Stage', type: 'keynote', speaker: 'Senior Industry Representative', duration: '45 min' },
      { time: '10:00', title: 'Panel: Financing Tractors & Equipment for Smallholder Farmers', location: 'Conference Tent', type: 'panel', speaker: 'Industry Panellists', duration: '60 min' },
      { time: '11:30', title: 'Live Demo — Tractors & Implements', location: 'Outdoor Demo Zone', type: 'demo', duration: '60 min' },
      { time: '13:00', title: 'Networking Lunch Break', location: 'Catering Area', type: 'break', duration: '60 min' },
      { time: '14:00', title: 'Session: Precision Irrigation Technology', location: 'Conference Tent', type: 'session', speaker: 'Technical Expert', duration: '45 min' },
      { time: '15:00', title: 'Sponsored Session: Digital Tools for Farm Management', location: 'Conference Tent', type: 'sponsored', speaker: 'Sponsor Presenter', duration: '30 min', virtual: true, webinar_url: '#' },
      { time: '16:30', title: 'Day 1 Networking Sundowner', location: 'Exhibitor Lounge', type: 'networking', duration: '90 min' },
      { time: '17:00', title: 'Exhibition Closes — Day 1', location: 'All Zones', type: 'logistics', duration: '' },
    ],
  },
  'Day 2': {
    date: '6 June 2026',
    theme: 'Livestock & Inputs',
    sessions: [
      { time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens — Livestock Auction Ring', location: 'Field Zone', type: 'exhibition', duration: 'All Day' },
      { time: '09:30', title: 'Keynote: Growing Livestock Value Chains in Zimbabwe', location: 'Main Stage', type: 'keynote', speaker: 'Government & Industry Leaders', duration: '45 min' },
      { time: '10:30', title: 'Live Livestock Auction', location: 'Field Zone', type: 'demo', duration: '90 min' },
      { time: '12:00', title: 'Roundtable: Fertiliser & Seed Trends for the 2026/27 Season', location: 'Conference Tent', type: 'panel', speaker: 'Agronomy Experts', duration: '60 min', virtual: true, webinar_url: '#' },
      { time: '13:00', title: 'Lunch Break', location: 'Catering Area', type: 'break', duration: '60 min' },
      { time: '14:00', title: 'Session: Animal Health & Biosecurity', location: 'Conference Tent', type: 'session', speaker: 'Veterinary Officer', duration: '45 min' },
      { time: '15:30', title: 'Exhibitor Speed Networking', location: 'Main Atrium', type: 'networking', duration: '60 min' },
      { time: '17:00', title: 'Exhibition Closes — Day 2', location: 'All Zones', type: 'logistics', duration: '' },
    ],
  },
  'Day 3': {
    date: '7 June 2026',
    theme: 'Suppliers, Finance & Closing',
    sessions: [
      { time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens', location: 'All Sections', type: 'exhibition', duration: 'All Day' },
      { time: '09:00', title: 'Session: Agri-Finance & Insurance for Growing Farm Businesses', location: 'Conference Tent', type: 'session', speaker: 'Banking & Insurance Expert', duration: '45 min' },
      { time: '10:30', title: 'Live Demo: Irrigation & Solar Water Pumping Systems', location: 'Outdoor Demo Zone', type: 'demo', duration: '60 min' },
      { time: '12:00', title: 'Closing Keynote & Exhibitor Awards Recognition', location: 'Main Stage', type: 'keynote', speaker: 'ADMA Organising Committee', duration: '60 min', virtual: true, webinar_url: '#' },
      { time: '13:00', title: 'Lunch & Final Networking', location: 'Catering Area', type: 'break', duration: '90 min' },
      { time: '15:00', title: `Exhibition Closes — ${EVENT_CONFIG.eventFullName}`, location: 'All Zones', type: 'logistics', duration: '' },
    ],
  },
};

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
  const [activeDay, setActiveDay] = useState('Day 1');
  const days = Object.keys(SCHEDULE);
  const day = SCHEDULE[activeDay];

  return (
    <div className="pb-24 max-w-2xl lg:max-w-4xl mx-auto">
      <div className="px-4 pt-5 mb-4">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Event Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">{EVENT_CONFIG.eventFullName} — 05–07 June 2026</p>
      </div>

      {/* Day tabs */}
      <div className="px-4 mb-5">
        <div className="lg:flex lg:items-center lg:gap-4">
          <div className="bg-muted rounded-xl p-1 flex gap-1 lg:flex-shrink-0">
            {days.map(d => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeDay === d ? 'bg-steel text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {d}
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
        {day.sessions.map((s, i) => {
          const cfg = typeConfig[s.type] || typeConfig.logistics;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex gap-3 items-start p-3.5 rounded-xl border-l-4 ${cfg.color}`}>
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
