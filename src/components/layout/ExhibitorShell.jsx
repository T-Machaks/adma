import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Store, Calendar, BarChart2, LogOut, Shield, ChevronLeft, ScanLine, Users } from 'lucide-react';
import MineConLogo from './MineConLogo.jsx';

const exhibitorNav = [
  { path: '/exhibitor',           label: 'My Booth',   icon: Store,     exact: true },
  { path: '/exhibitor/meetings',  label: 'Meetings',   icon: Calendar },
  { path: '/exhibitor/scan',      label: 'Scan',       icon: ScanLine },
  { path: '/exhibitor/analytics', label: 'Analytics',  icon: BarChart2 },
  { path: '/exhibitor/team',      label: 'Team',       icon: Users },
];

export default function ExhibitorShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/exhibitor';

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-steel border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 text-white select-none"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex-shrink-0">
            <MineConLogo />
          </Link>
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <span className="text-amber text-xs font-bold uppercase tracking-widest hidden sm:block flex-shrink-0">
            Exhibitor Portal
          </span>

          <nav className="flex items-center gap-1 ml-auto">
            {exhibitorNav.map(({ path, label, icon: Icon, exact }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 select-none ${
                  isActive(path, exact)
                    ? 'bg-amber text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}

            <div className="w-px h-5 bg-white/20 mx-1" />

            <Link
              to="/console"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
              title="Management Console"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Console</span>
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Attendee App</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
