import { Link } from 'react-router-dom';
import { Users, Map, Calendar, Info, Bell, QrCode, LayoutDashboard, ArrowRight, Megaphone, AlertCircle, Clock, Gauge, Star, BookOpen, MessageSquare, BarChart2, Shield, UserCheck, Zap, Sparkles, UserPlus, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Announcement, Exhibitor } from '@/api/entities';
import AdBannerCarousel from '@/components/home/AdBannerCarousel';
import VirtualBanner from '@/components/VirtualBanner';
import { track } from '@/lib/tracking';
import { useAppSettings } from '@/lib/AppSettingsContext';

const quickActions = [
  { label: 'Exhibitors', path: '/exhibitors', icon: Users, color: 'bg-blue-600' },
  { label: 'Site Plan', path: '/site-plan', icon: Map, color: 'bg-emerald-600' },
  { label: 'Meetings', path: '/meetings', icon: Calendar, color: 'bg-violet-600' },
  { label: 'Schedule', path: '/schedule', icon: Clock, color: 'bg-rose-600' },
  { label: 'Register', path: '/register', icon: UserCheck, color: 'bg-amber-500' },
  { label: 'Publications', path: '/magazine', icon: BookOpen, color: 'bg-indigo-600' },
  { label: 'Sponsors', path: '/sponsors', icon: Star, color: 'bg-yellow-500' },
  { label: 'QR Resources', path: '/qr-resources', icon: QrCode, color: 'bg-slate-600' },
];

const typeIcon = { Important: AlertCircle, Reminder: Clock, General: Megaphone, Update: Bell };
const typeColor = {
  Important: 'border-red-400 bg-red-50 dark:bg-red-950/30',
  Reminder: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
  General: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
  Update: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
};

export default function Home() {
  const { settings } = useAppSettings();
  const { isAuthenticated } = useAuth();
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });
  const { data: exhibitors = [] } = useQuery({
    queryKey: ['featured-exhibitors'],
    queryFn: () => Exhibitor.filter({ featured: true }),
  });

  const pinned = announcements.filter(a => a.pinned);
  const recent = announcements.filter(a => !a.pinned).slice(0, 3);

  return (
    <div className="pb-20">
      {/* Hero */}
      <div className="bg-steel text-white px-4 pt-8 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px'}} />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-block bg-amber text-white text-xs font-bold px-3 py-1 rounded-full mb-4 tracking-widest uppercase">
            2026 Edition · Dates TBC
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-wider mb-2">
            MINECON 2026
          </h1>
          <p className="text-slate-300 text-base mb-1">Mining & Construction Exhibition</p>
          <p className="text-amber font-medium text-sm mb-6">Artfarm Grounds, Pomona, Harare, Zimbabwe</p>
          <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
            Southern Africa's premier B2B platform connecting suppliers, equipment providers, and professional services with buyers across the mining and construction sectors.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to="/exhibitors" className="bg-amber hover:bg-amber-dark active:scale-95 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all duration-150 select-none shadow-md hover:shadow-lg">
              Browse Exhibitors
            </Link>
            <Link to="/meetings" className="border border-white/30 hover:bg-white/10 active:scale-95 active:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all duration-150 select-none">
              Book a Meeting
            </Link>
          </div>
        </div>
      </div>

      {/* Ad banner carousel */}
      <div className="pt-4">
        <AdBannerCarousel />
      </div>

      {/* Virtual exhibition banner */}
      {settings.virtualExhibitionOpen && <VirtualBanner />}

      {/* Pinned announcements */}
      {pinned.length > 0 && (
        <div className="px-4 pt-5">
          <div className="max-w-2xl mx-auto space-y-2">
            {pinned.map(a => {
              const Icon = typeIcon[a.type] || Megaphone;
              return (
                <div key={a.id} className={`flex gap-3 items-start p-3 rounded-lg border-l-4 ${typeColor[a.type] || typeColor.General}`}>
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground/70" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold uppercase bg-foreground/10 px-1.5 py-0.5 rounded">Pinned</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4 pt-6 pb-2 w-full max-w-2xl mx-auto">
        {/* Quick actions */}
        <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-foreground mb-3">Quick Access</h2>
        <div className="grid grid-cols-4 xs:grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map(({ label, path, icon: Icon, color }) => (
            <Link key={path} to={path} className="flex flex-col items-center gap-1.5 group select-none">
              <div className={`${color} rounded-xl flex items-center justify-center shadow-md w-full aspect-square transition-all duration-150 group-hover:scale-105 group-active:scale-90 group-hover:shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[11px] font-medium text-center text-muted-foreground leading-tight group-hover:text-foreground transition-colors duration-150">{label}</span>
            </Link>
          ))}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Exhibitors', value: '80+' },
            { label: 'Booth Zones', value: '4' },
            { label: 'Days', value: '3' },
          ].map(s => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-3 text-center">
              <div className="font-heading text-2xl font-bold text-amber">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Get started — only shown to guests */}
        {!isAuthenticated && (
          <div className="mt-6">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-foreground mb-3">Get Started</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/signup"
                className="flex flex-col gap-2 p-4 rounded-xl border-2 border-amber bg-amber/5 hover:bg-amber/10 active:scale-95 transition-all duration-150 select-none"
              >
                <div className="w-9 h-9 rounded-lg bg-amber flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Free Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Book meetings, send enquiries — no ticket needed</p>
                </div>
                <span className="text-xs font-bold text-amber flex items-center gap-1 mt-auto">
                  Create account <ArrowRight className="w-3 h-3" />
                </span>
              </Link>

              <Link
                to="/register"
                className="flex flex-col gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 active:scale-95 transition-all duration-150 select-none"
              >
                <div className="w-9 h-9 rounded-lg bg-steel flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight">Event Registration</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Get a badge & ticket to attend the exhibition</p>
                </div>
                <span className="text-xs font-bold text-foreground/60 flex items-center gap-1 mt-auto">
                  Register now <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* Featured Exhibitors */}
        {exhibitors.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Featured Exhibitors</h2>
              <Link to="/exhibitors" className="text-amber text-xs font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {exhibitors.slice(0, 6).map(ex => (
                <div key={ex.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {ex.logo_url
                      ? <img src={ex.logo_url} alt={ex.name} className="w-9 h-9 object-contain" />
                      : <span className="font-heading text-lg font-bold text-muted-foreground">{ex.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">Booth {ex.booth} · {ex.category}</p>
                  </div>
                  <Link
                    to="/meetings"
                    state={{ exhibitor: ex }}
                    onClick={() => track(ex.id, ex.name, 'featured_click', 'home_featured')}
                    className="text-xs bg-amber text-white px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
                  >
                    Meet
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest announcements */}
        {recent.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold uppercase tracking-wide">Latest Updates</h2>
              <Link to="/announcements" className="text-amber text-xs font-medium flex items-center gap-1">
                All updates <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recent.map(a => {
                const Icon = typeIcon[a.type] || Megaphone;
                if (a.sponsored) {
                  return (
                    <div key={a.id} className="flex gap-3 items-start p-3 rounded-lg border-l-4 border-l-amber-400 border border-amber/20 bg-amber-50/40 dark:bg-amber-950/10">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber bg-amber/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        {a.sponsor_name || 'Sponsored'}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={a.id} className={`flex gap-3 items-start p-3 rounded-lg border-l-4 ${typeColor[a.type] || typeColor.General}`}>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No announcements placeholder */}
        {announcements.length === 0 && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-1">Event updates will appear here and on the Updates page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
