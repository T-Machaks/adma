import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { Store, Calendar, BarChart2, LogOut, ChevronLeft, ScanLine, Users, Inbox, MessageCircle, Briefcase, FileText, Handshake } from 'lucide-react';
import EventLogo from './EventLogo.jsx';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const exhibitorNav = [
  { path: '/exhibitor',           label: 'My Booth',   icon: Store,     exact: true },
  { path: '/exhibitor/meetings',  label: 'Meetings',   icon: Calendar },
  { path: '/exhibitor/scan',      label: 'Scan',       icon: ScanLine },
  { path: '/exhibitor/analytics', label: 'Analytics',  icon: BarChart2 },
  { path: '/exhibitor/team',      label: 'Team',       icon: Users },
  { path: '/exhibitor/enquiries', label: 'Enquiries',  icon: Inbox },
  { path: '/exhibitor/messages',  label: 'Messages',   icon: MessageCircle },
  { path: '/exhibitor/jobs',      label: 'Jobs',        icon: Briefcase },
  { path: '/exhibitor/tenders',   label: 'Tenders',     icon: FileText },
  { path: '/exhibitor/collaborations', label: 'Collaborations', icon: Handshake },
];

export default function ExhibitorShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const isHome = location.pathname === '/exhibitor';

  if (isLoadingAuth) return null;
  if (!user || user.role !== 'exhibitor') {
    return <Navigate to="/exhibitor-login" replace />;
  }

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-steel border-b border-white/10">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
          {!isHome && (
            <button
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/exhibitor')}
              className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 text-white select-none touch-manipulation"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex-shrink-0">
            <EventLogo />
          </Link>
          <div className="h-5 w-px bg-white/20 hidden sm:block" />
          <span className="text-amber text-xs font-bold uppercase tracking-widest hidden sm:block flex-shrink-0">
            Exhibitor Portal
          </span>

          <nav className="flex items-center gap-0.5 sm:gap-1 ml-auto">
            {exhibitorNav.map(({ path, label, icon: Icon, exact }) => (
              <Link
                key={path}
                to={path}
                title={label}
                className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 select-none touch-manipulation ${
                  isActive(path, exact)
                    ? 'bg-amber text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}

            <div className="w-px h-5 bg-white/20 mx-0.5 sm:mx-1 hidden sm:block" />

            <button
              onClick={() => { localStorage.removeItem(EVENT_CONFIG.storageUserKey); navigate('/exhibitor-login'); }}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 touch-manipulation"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
