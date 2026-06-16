import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, BarChart2, MessageSquare, Shield,
  LogOut, Users, Menu, X, ChevronLeft, UserCog, ScanLine,
} from 'lucide-react';
import { useState } from 'react';
import MineConLogo from './MineConLogo.jsx';

const consoleNav = [
  { path: '/console',                 label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { path: '/console/registrations',   label: 'Registrations',   icon: Users },
  { path: '/console/check-in',        label: 'Gate Check-In',   icon: ScanLine },
  { path: '/console/analytics',       label: 'Analytics',       icon: BarChart2 },
  { path: '/console/communications',  label: 'Communications',  icon: MessageSquare },
  { path: '/console/users',           label: 'Users & Roles',   icon: UserCog },
  { path: '/console/admin',           label: 'Admin & Security',icon: Shield },
];

export default function ConsoleShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === '/console';

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const NavLinks = () => (
    <>
      {consoleNav.map(({ path, label, icon: Icon, exact }) => (
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
            <MineConLogo />
          </Link>
          <p className="text-[10px] text-amber font-bold uppercase tracking-widest mt-2">
            Management Console
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-white/10 space-y-0.5">
          <Link
            to="/exhibitor"
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-all"
          >
            <Users className="w-4 h-4" />
            Exhibitor Portal
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Attendee App
          </Link>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-steel flex flex-col h-full shadow-xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <MineConLogo />
                <p className="text-[10px] text-amber font-bold uppercase tracking-widest mt-1">Console</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              <NavLinks />
            </nav>
            <div className="p-3 border-t border-white/10">
              <Link to="/" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-all">
                <LogOut className="w-4 h-4" />
                Attendee App
              </Link>
            </div>
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
          <MineConLogo />
          <span className="text-amber text-xs font-bold uppercase tracking-widest">Console</span>
          <div className="flex-1" />
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
