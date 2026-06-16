import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Map, Calendar, Info, Bell,
  LayoutDashboard, QrCode, Menu, X, Star,
  BookOpen, UserCheck, Zap, Clock, Shield, ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import MineConLogo from './MineConLogo.jsx';

const navGroups = [
  {
    label: 'Exhibition',
    items: [
      { path: '/',            label: 'Home',            icon: Home },
      { path: '/exhibitors',  label: 'Exhibitors',      icon: Users },
      { path: '/sponsors',    label: 'Sponsors',        icon: Star },
      { path: '/site-plan',   label: 'Site Plan',       icon: Map },
      { path: '/schedule',    label: 'Schedule',        icon: Clock },
      { path: '/meetings',    label: 'Meetings',        icon: Calendar },
    ],
  },
  {
    label: 'My MineCon',
    items: [
      { path: '/connect',             label: 'Connect Hub',     icon: Zap },
      { path: '/attendee-dashboard',  label: 'My Dashboard',    icon: LayoutDashboard },
      { path: '/register',            label: 'Registration',    icon: UserCheck },
    ],
  },
  {
    label: 'Content & Info',
    items: [
      { path: '/magazine',      label: 'Digital Magazine',  icon: BookOpen },
      { path: '/announcements', label: 'Updates',           icon: Bell },
      { path: '/event-info',    label: 'Event Info',        icon: Info },
      { path: '/qr-resources',  label: 'QR Resources',      icon: QrCode },
    ],
  },
];

const bottomNav = [
  { path: '/',            label: 'Home',       icon: Home },
  { path: '/exhibitors',  label: 'Exhibitors', icon: Users },
  { path: '/connect',     label: 'Connect',    icon: Zap },
  { path: '/meetings',    label: 'Meetings',   icon: Calendar },
  { path: '/magazine',    label: 'Magazine',   icon: BookOpen },
];

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-steel shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Back button on all pages except home */}
          {!isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 select-none text-white"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}

          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <MineConLogo />
          </Link>

          <div className="flex-1" />

          <button
            className="text-white p-1.5 rounded-md hover:bg-white/10 active:scale-95 transition-all duration-150 select-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="bg-steel border-t border-white/10 px-4 py-3 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            {navGroups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-1">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 select-none ${
                        isActive(path)
                          ? 'bg-amber text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white active:bg-white/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Portal links */}
            <div className="border-t border-white/10 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-1">
                Portals
              </p>
              <div className="flex flex-col gap-0.5">
                <Link
                  to="/exhibitor"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-95"
                >
                  <Users className="w-4 h-4" /> Exhibitor Portal
                </Link>
                <Link
                  to="/console"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-95"
                >
                  <Shield className="w-4 h-4" /> Management Console
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <nav className="sticky bottom-0 z-50 bg-steel border-t border-white/10">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {bottomNav.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-all duration-150 active:scale-90 select-none ${
                isActive(path) ? 'text-amber' : 'text-slate-400 hover:text-slate-200 active:text-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
