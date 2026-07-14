import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BarChart2, MessageSquare, Shield,
  LogOut, Users, Menu, X, ChevronLeft, UserCog, ScanLine, Megaphone, ClipboardList, Inbox, Video, Gavel,
} from 'lucide-react';
import { useState } from 'react';
import EventLogo from './EventLogo.jsx';
import { useAuth } from '@/lib/AuthContext';

const consoleNav = [
  { path: '/console',                label: 'Dashboard',        icon: LayoutDashboard, exact: true, roles: ['organizer', 'marketing_partner', 'superadmin'] },
  { path: '/console/registrations',  label: 'Registrations',    icon: Users,                        roles: ['organizer', 'superadmin'] },
  { path: '/console/check-in',       label: 'Gate Check-In',    icon: ScanLine,                     roles: ['organizer', 'superadmin'] },
  { path: '/console/analytics',      label: 'Analytics',        icon: BarChart2,                    roles: ['organizer', 'marketing_partner', 'superadmin'] },
  { path: '/console/sessions',        label: 'Sessions',         icon: Video,                        roles: ['organizer', 'superadmin'] },
  { path: '/console/auctions',        label: 'Auctions',         icon: Gavel,                        roles: ['organizer', 'superadmin'] },
  { path: '/console/communications', label: 'Communications',   icon: MessageSquare,                roles: ['organizer', 'superadmin'] },
  { path: '/console/marketing',      label: 'Marketing Hub',    icon: Megaphone,                    roles: ['marketing_partner', 'superadmin'] },
  { path: '/console/exhibitor-applications', label: 'Exhibitor Applications', icon: ClipboardList, roles: ['organizer', 'superadmin'] },
  { path: '/console/enquiries',              label: 'Enquiries',              icon: Inbox,         roles: ['organizer', 'superadmin'] },
  { path: '/console/users',          label: 'Users & Roles',    icon: UserCog,                      roles: ['organizer', 'superadmin'] },
  { path: '/console/admin',          label: 'Admin & Security', icon: Shield,                       roles: ['organizer', 'superadmin'] },
];

const ROLE_LABELS = {
  organizer:         'Organizer',
  marketing_partner: 'Marketing Partner',
  superadmin:        'Super Admin',
};

export default function ConsoleShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/console';

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const visibleNav = consoleNav.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/console/login', { replace: true });
  };

  const UserBlock = () => (
    <div className="p-3 border-t border-white/10">
      {/* User info */}
      <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {user?.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">{user?.full_name || 'Console User'}</p>
          <p className="text-slate-400 text-[10px] truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
        </div>
      </div>
      {/* Actions */}
      <Link
        to="/exhibitor"
        onClick={() => setMobileOpen(false)}
        className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-all"
      >
        <Users className="w-4 h-4 flex-shrink-0" />
        Exhibitor Portal
      </Link>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-red-400 text-sm rounded-lg hover:bg-white/10 transition-all"
      >
        <LogOut className="w-4 h-4 flex-shrink-0" />
        Log out
      </button>
    </div>
  );

  const NavLinks = () => (
    <>
      {visibleNav.map(({ path, label, icon: Icon, exact }) => (
        <Link
          key={path}
          to={path}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 select-none ${
            isActive(path, exact)
              ? 'bg-amber text-white shadow-sm'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 bg-steel sticky top-0 h-screen">
        <div className="p-4 border-b border-white/10">
          <Link to="/" className="block">
            <EventLogo />
          </Link>
          <p className="text-[10px] text-amber font-bold uppercase tracking-widest mt-2">
            {user?.role === 'marketing_partner' ? 'Marketing Console' : 'Management Console'}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <UserBlock />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-steel flex flex-col h-full shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <EventLogo />
                <p className="text-[10px] text-amber font-bold uppercase tracking-widest mt-1">Console</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavLinks />
            </nav>
            <UserBlock />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-steel border-b border-white/10 h-14 flex items-center px-4 gap-3">
          {!isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 text-white select-none"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={() => setMobileOpen(true)} className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <EventLogo />
          <span className="text-amber text-xs font-bold uppercase tracking-widest">Console</span>
          <div className="flex-1" />
          {/* Logout button in mobile top bar */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-all text-xs"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {!isHome && (
            <button onClick={() => setMobileOpen(true)} className="text-white p-1.5 rounded-md hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}