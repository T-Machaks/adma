import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Registration, MeetingRequest, Exhibitor } from '@/api/entities';
import { Users, Calendar, BarChart2, Bell, Shield, BookOpen, Star, MessageSquare, FileText, Map, Clock, Smartphone, TrendingUp, ChevronRight, Zap } from 'lucide-react';

const MODULES = [
  {
    section: 'Registration & Attendance',
    items: [
      { label: 'Event Registration', desc: 'Register attendees, exhibitors, sponsors, speakers, and VIPs', path: '/register', icon: Users, color: 'bg-amber-500' },
      { label: 'Attendee Dashboard', desc: 'Personal schedule, saved exhibitors, notes, and meetings', path: '/attendee-dashboard', icon: Smartphone, color: 'bg-blue-500' },
      { label: 'Admin & Security', desc: 'Roles, permissions, OTP verification, and user management', path: '/admin', icon: Shield, color: 'bg-red-500' },
    ],
  },
  {
    section: 'Exhibitors & Sponsors',
    items: [
      { label: 'Exhibitor Directory', desc: 'Browse all exhibitors with filters, contacts, and meeting booking', path: '/exhibitors', icon: FileText, color: 'bg-emerald-500' },
      { label: 'Sponsors & Partners', desc: 'Sponsor profiles, banner ads, and tier placements', path: '/sponsors', icon: Star, color: 'bg-yellow-500' },
      { label: 'Book a Meeting', desc: 'Schedule one-on-one meetings with exhibitors at the show', path: '/meetings', icon: Calendar, color: 'bg-violet-500' },
    ],
  },
  {
    section: 'Event Programme',
    items: [
      { label: 'Event Schedule', desc: 'Full 3-day agenda with session times, speakers, and locations', path: '/schedule', icon: Clock, color: 'bg-rose-500' },
      { label: 'Site Plan', desc: 'Interactive floor map with booth zones and exhibitor positions', path: '/site-plan', icon: Map, color: 'bg-teal-500' },
      { label: 'Event Information', desc: 'Venue details, FAQs, rules, and exhibitor tier guide', path: '/event-info', icon: Bell, color: 'bg-sky-500' },
    ],
  },
  {
    section: 'Communications & Content',
    items: [
      { label: 'Communications Hub', desc: 'Countdown, announcements, venue notices, and campaign messaging', path: '/communications', icon: MessageSquare, color: 'bg-orange-500' },
      { label: 'Digital Magazine', desc: '10-page interactive event guide with product spotlights and sponsor ads', path: '/magazine', icon: BookOpen, color: 'bg-indigo-500' },
      { label: 'QR Resources', desc: 'How to use QR codes to access brochures, videos, and contacts', path: '/qr-resources', icon: Zap, color: 'bg-lime-600' },
    ],
  },
  {
    section: 'Analytics & Reporting',
    items: [
      { label: 'Analytics Dashboard', desc: 'Registrations, check-ins, meetings, QR scans, and engagement data', path: '/analytics', icon: BarChart2, color: 'bg-slate-600' },
    ],
  },
];

export default function Connect() {
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => Registration.list() });
  const { data: meetings = [] } = useQuery({ queryKey: ['meetings'], queryFn: () => MeetingRequest.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ['exhibitors'], queryFn: () => Exhibitor.list() });

  return (
    <div className="pb-24 max-w-3xl mx-auto px-4 pt-5">
      {/* Header */}
      <div className="bg-steel text-white rounded-2xl p-5 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-center gap-4">
          <img src="/minecon-logo.png" alt="MineCon" className="w-14 h-14 object-contain flex-shrink-0" />
          <div>
            <p className="text-amber text-xs font-bold uppercase tracking-widest mb-0.5">MineCon Connect</p>
            <h1 className="font-heading text-2xl font-bold tracking-wide">Event Management Platform</h1>
            <p className="text-slate-300 text-xs mt-1">Complete dashboard for registration, engagement, exhibitors, communications, and analytics.</p>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Registrations" value={registrations.length} color="text-amber" />
        <StatCard label="Meetings" value={meetings.length} color="text-violet-500" />
        <StatCard label="Exhibitors" value={exhibitors.length} color="text-emerald-500" />
      </div>

      {/* Module sections */}
      {MODULES.map(section => (
        <div key={section.section} className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 px-1">{section.section}</p>
          <div className="space-y-2">
            {section.items.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}
                  className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-amber/40 hover:bg-amber/5 transition-all group">
                  <div className={`w-11 h-11 ${item.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-amber transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* PWA access link */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-center gap-3">
        <Smartphone className="w-8 h-8 text-muted-foreground flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">PWA Visitor App</p>
          <p className="text-xs text-muted-foreground">The visitor-facing PWA is accessible from the Home page and all standard navigation.</p>
        </div>
        <Link to="/" className="text-amber text-xs font-semibold flex-shrink-0 hover:underline">Open →</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className={`font-heading text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
