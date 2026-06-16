import { useState } from 'react';
import { Clock, MapPin, Star, Users, Mic } from 'lucide-react';

const SCHEDULE = {
  'Day 1': {
    date: 'TBC — October 2026',
    theme: 'Mining Sector Focus',
    sessions: [
      { time: '07:30', title: 'Gates Open & Registration', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens — Mining Hall', location: 'Mining Section', type: 'exhibition', duration: 'All Day' },
      { time: '09:00', title: 'Opening Keynote: The Future of Mining in Southern Africa', location: 'Main Stage', type: 'keynote', speaker: 'Senior Industry Representative', duration: '45 min' },
      { time: '10:00', title: 'Panel: Sustainable Mining Practices', location: 'Conference Tent', type: 'panel', speaker: 'Industry Panellists', duration: '60 min' },
      { time: '11:30', title: 'Equipment Live Demonstration — Heavy Machinery', location: 'Outdoor Demo Zone', type: 'demo', duration: '60 min' },
      { time: '13:00', title: 'Networking Lunch Break', location: 'Catering Area', type: 'break', duration: '60 min' },
      { time: '14:00', title: 'Session: Minerals Processing Technology', location: 'Conference Tent', type: 'session', speaker: 'Technical Expert', duration: '45 min' },
      { time: '15:00', title: 'Sponsored Session: Digital Tools for Mine Management', location: 'Conference Tent', type: 'sponsored', speaker: 'Sponsor Presenter', duration: '30 min' },
      { time: '16:30', title: 'Day 1 Networking Sundowner', location: 'Exhibitor Lounge', type: 'networking', duration: '90 min' },
      { time: '18:00', title: 'Exhibition Closes — Day 1', location: 'All Zones', type: 'logistics', duration: '' },
    ],
  },
  'Day 2': {
    date: 'TBC — October 2026',
    theme: 'Construction & Infrastructure',
    sessions: [
      { time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens — Construction Hall', location: 'Construction Section', type: 'exhibition', duration: 'All Day' },
      { time: '09:30', title: 'Keynote: Infrastructure Investment in Zimbabwe', location: 'Main Stage', type: 'keynote', speaker: 'Government & Industry Leaders', duration: '45 min' },
      { time: '11:00', title: 'Live Demo: Concrete & Structural Solutions', location: 'Outdoor Demo Zone', type: 'demo', duration: '60 min' },
      { time: '12:00', title: 'Roundtable: Procurement Trends in Construction', location: 'Conference Tent', type: 'panel', speaker: 'Procurement Experts', duration: '60 min' },
      { time: '13:00', title: 'Lunch Break', location: 'Catering Area', type: 'break', duration: '60 min' },
      { time: '14:00', title: 'Session: Health & Safety in Construction Environments', location: 'Conference Tent', type: 'session', speaker: 'Safety Officer', duration: '45 min' },
      { time: '15:30', title: 'Exhibitor Speed Networking', location: 'Main Atrium', type: 'networking', duration: '60 min' },
      { time: '18:00', title: 'Exhibition Closes — Day 2', location: 'All Zones', type: 'logistics', duration: '' },
    ],
  },
  'Day 3': {
    date: 'TBC — October 2026',
    theme: 'Suppliers, Solutions & Closing',
    sessions: [
      { time: '07:30', title: 'Gates Open', location: 'Main Entrance', type: 'logistics', duration: '30 min' },
      { time: '08:00', title: 'Exhibition Opens', location: 'All Sections', type: 'exhibition', duration: 'All Day' },
      { time: '09:00', title: 'Session: Supply Chain Challenges in Sub-Saharan Africa', location: 'Conference Tent', type: 'session', speaker: 'Logistics Expert', duration: '45 min' },
      { time: '10:30', title: 'Live Demo: Drill & Blast Equipment', location: 'Outdoor Demo Zone', type: 'demo', duration: '60 min' },
      { time: '12:00', title: 'Closing Keynote & Industry Awards Recognition', location: 'Main Stage', type: 'keynote', speaker: 'MineCon Organising Committee', duration: '60 min' },
      { time: '13:00', title: 'Lunch & Final Networking', location: 'Catering Area', type: 'break', duration: '90 min' },
      { time: '15:00', title: 'Exhibition Closes — MineCon 2026', location: 'All Zones', type: 'logistics', duration: '' },
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
    <div className="pb-24 max-w-2xl mx-auto">
      <div className="px-4 pt-5 mb-4">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Event Schedule</h1>
        <p className="text-muted-foreground text-sm mt-1">MineCon 2026 — Dates to be confirmed</p>
      </div>

      {/* Day tabs */}
      <div className="px-4 mb-5">
        <div className="bg-muted rounded-xl p-1 flex gap-1">
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
        <div className="mt-2 px-1 flex items-center justify-between">
          <p className="text-xs text-amber font-semibold">{day.theme}</p>
          <p className="text-xs text-muted-foreground">{day.date}</p>
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
              </div>
              {cfg.label && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.dot} text-white flex-shrink-0`}>{cfg.label}</span>}
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="px-4 mt-6">
        <div className="bg-muted/50 rounded-xl p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">📅 Dates to be confirmed</p>
          <p>The MineCon 2026 schedule is indicative. Session times, speakers, and venues are subject to change. Check this app for real-time updates closer to the event.</p>
        </div>
      </div>
    </div>
  );
}
