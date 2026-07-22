import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Map, Calendar, Info, Bell,
  LayoutDashboard, QrCode, Menu, X, Star, Zap,
  BookOpen, UserCheck, Clock, Shield, ChevronLeft, ChevronRight, Download,
  LogIn, LogOut, UserCircle, WifiOff, Video, Briefcase, FileText, Gavel, Handshake,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import EventLogo from './EventLogo.jsx';
import FooterAdBanner from './FooterAdBanner.jsx';
import { usePWAInstall } from '@/lib/PWAInstallContext';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const navGroups = [
  {
    label: 'Exhibition',
    items: [
      { path: '/',            label: 'Home',            icon: Home },
      { path: '/exhibitors',  label: 'Exhibitors',      icon: Users },
      { path: '/sponsors',    label: 'Sponsors & Members', icon: Star },
      { path: '/site-plan',   label: 'Site Plan',       icon: Map },
      { path: '/schedule',    label: 'Schedule',        icon: Clock },
      { path: '/meetings',    label: 'Meetings',        icon: Calendar },
    ],
  },
  {
    label: EVENT_CONFIG.nav.myEventLabel,
    items: [
      { path: '/connect',             label: 'Connect Hub',     icon: Zap },
      { path: '/attendee-dashboard',  label: 'My Dashboard',    icon: LayoutDashboard },
      { path: '/register',            label: 'Registration',    icon: UserCheck },
      { path: '/qr-resources',        label: 'QR Resources',    icon: QrCode },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { path: '/jobs',          label: 'Jobs Board',         icon: Briefcase },
      { path: '/tenders',       label: 'Tenders',            icon: FileText },
      { path: '/auctions',      label: 'Auctions',           icon: Gavel },
      { path: '/collaborations', label: 'Collaborations',    icon: Handshake },
    ],
  },
  {
    label: 'Content & Info',
    items: [
      { path: '/sessions',      label: 'Live Sessions',      icon: Video },
      { path: '/magazine',      label: 'Publications',       icon: BookOpen },
      { path: '/announcements', label: 'Updates',            icon: Bell },
      { path: '/event-info',    label: 'Event Info',         icon: Info },
    ],
  },
];

const bottomNav = [
  { path: '/',                    label: 'Home',       icon: Home },
  { path: '/exhibitors',          label: 'Exhibitors', icon: Users },
  { path: '/attendee-dashboard',  label: EVENT_CONFIG.nav.myEventLabel, icon: LayoutDashboard },
  { path: '/meetings',            label: 'Meetings',   icon: Calendar },
  { path: '/magazine',            label: 'Publications', icon: BookOpen },
];

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, hasConsoleAccess, hasExhibitorAccess } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [installBarDismissed, setInstallBarDismissed] = useState(() => {
    try { return sessionStorage.getItem('install-bar-dismissed') === '1'; } catch { return false; }
  });
  const { showMenuLink, isIOS, hasBrowserPrompt, promptInstall } = usePWAInstall();

  const dismissInstallBar = () => {
    try { sessionStorage.setItem('install-bar-dismissed', '1'); } catch {}
    setInstallBarDismissed(true);
  };

  const handleInstallClick = async () => {
    if (hasBrowserPrompt) {
      await promptInstall();
      dismissInstallBar();
    } else if (isIOS) {
      // Show iOS instructions inline in the bar — handled via state
      setShowIOSHint(p => !p);
    }
  };

  const [showIOSHint, setShowIOSHint] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const isHome = location.pathname === '/';
  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const toggleSidebar = () => {
    setSidebarCollapsed(c => {
      const next = !c;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 shadow-2xl border-b border-white/10">
        <div className="h-0.5 bg-gradient-to-r from-amber via-amber/80 to-amber/40" />
        <div style={{background: 'linear-gradient(to right, hsl(150,35%,8%), hsl(150,35%,16%), hsl(150,30%,13%))'}}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Back button — mobile only, non-home pages */}
          {!isHome ? (
            <button
              onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
              className="lg:hidden flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all duration-150 select-none text-white touch-manipulation"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}

          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <EventLogo />
          </Link>

          <div className="flex-1" />

          {/* Auth button — desktop */}
          <div className="hidden lg:flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-300 text-sm truncate max-w-[140px]">{user?.full_name || user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-slate-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <LogIn className="w-4 h-4" /> Sign in
              </Link>
            )}
          </div>

          {/* Hamburger — hidden on desktop */}
          <button
            className="lg:hidden text-white flex items-center justify-center w-11 h-11 rounded-md hover:bg-white/10 active:scale-95 transition-all duration-150 select-none touch-manipulation"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="lg:hidden bg-steel border-t border-white/10 px-4 py-3 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
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

            {(hasExhibitorAccess() || hasConsoleAccess()) && (
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-1">
                  Portals
                </p>
                <div className="flex flex-col gap-0.5">
                  {hasExhibitorAccess() && (
                    <Link
                      to="/exhibitor"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-95"
                    >
                      <Users className="w-4 h-4" /> Exhibitor Portal
                    </Link>
                  )}
                  {hasConsoleAccess() && (
                    <Link
                      to="/console"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-150 active:scale-95"
                    >
                      <Shield className="w-4 h-4" /> Management Console
                    </Link>
                  )}
                </div>
              </div>
            )}

            {showMenuLink && (
              <div className="border-t border-white/10 pt-3">
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    if (hasBrowserPrompt) {
                      await promptInstall();
                    } else {
                      setShowIOSHint(true);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber hover:bg-amber/10 transition-all duration-150 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  {isIOS ? 'Add to Home Screen' : 'Install App'}
                </button>
              </div>
            )}

            <div className="border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <UserCircle className="w-4 h-4 text-amber flex-shrink-0" />
                    <span className="text-sm text-slate-300 truncate">{user?.full_name || user?.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-150 active:scale-95"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber hover:bg-amber/10 transition-all duration-150 active:scale-95"
                >
                  <LogIn className="w-4 h-4" /> Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-2 text-sm text-slate-300">
          <WifiOff className="w-4 h-4 text-amber flex-shrink-0" />
          <span>You're offline — showing cached content. Some features may be unavailable.</span>
        </div>
      )}

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 relative">
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex flex-col fixed top-14 bottom-0 left-0 z-40 bg-steel border-r border-white/10 overflow-y-auto overflow-x-hidden transition-all duration-200 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
        >
          {/* Collapse toggle */}
          <div className="flex items-center justify-end p-2 flex-shrink-0 border-b border-white/10">
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft className="w-4 h-4" />
              }
            </button>
          </div>

          {/* Nav items */}
          <div className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
            {navGroups.map(group => (
              <div key={group.label} className="mb-4">
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-2">
                    {group.label}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      title={sidebarCollapsed ? label : undefined}
                      className={`flex items-center px-2 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'
                      } ${
                        isActive(path)
                          ? 'bg-amber text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Portals — only for users with portal access */}
            {(hasExhibitorAccess() || hasConsoleAccess()) && (
              <div className="pt-3 border-t border-white/10">
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-2">
                    Portals
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {hasExhibitorAccess() && (
                    <Link
                      to="/exhibitor"
                      title={sidebarCollapsed ? 'Exhibitor Portal' : undefined}
                      className={`flex items-center px-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                    >
                      <Users className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>Exhibitor Portal</span>}
                    </Link>
                  )}
                  {hasConsoleAccess() && (
                    <Link
                      to="/console"
                      title={sidebarCollapsed ? 'Management Console' : undefined}
                      className={`flex items-center px-2 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white transition-all ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                    >
                      <Shield className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>Management Console</span>}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Install App */}
            {showMenuLink && (
              <div className="pt-3 mt-2 border-t border-white/10">
                <button
                  onClick={async () => {
                    if (hasBrowserPrompt) {
                      await promptInstall();
                    } else {
                      setShowIOSHint(p => !p);
                    }
                  }}
                  title={sidebarCollapsed ? (isIOS ? 'Add to Home Screen' : 'Install App') : undefined}
                  className={`w-full flex items-center px-2 py-2 rounded-lg text-sm font-medium text-amber hover:bg-amber/10 transition-all ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                >
                  <Download className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && (isIOS ? 'Add to Home Screen' : 'Install App')}
                </button>
              </div>
            )}

            {/* Account */}
            <div className="pt-3 mt-2 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  {!sidebarCollapsed && (
                    <p className="text-xs text-slate-500 truncate px-2 mb-1">{user?.full_name || user?.email}</p>
                  )}
                  <button
                    onClick={handleLogout}
                    title={sidebarCollapsed ? 'Log out' : undefined}
                    className={`w-full flex items-center px-2 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {!sidebarCollapsed && 'Log out'}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  title={sidebarCollapsed ? 'Sign in' : undefined}
                  className={`flex items-center px-2 py-2 rounded-lg text-sm font-medium text-amber hover:bg-amber/10 transition-all ${sidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                >
                  <LogIn className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && 'Sign in'}
                </Link>
              )}
            </div>
          </div>
        </aside>

        {/* Main content — shifts right on desktop to clear sidebar */}
        <main className={`flex-1 min-w-0 transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
          {children}
          <FooterAdBanner />
        </main>
      </div>

      {/* Install bar — mobile only, above bottom nav */}
      {showMenuLink && !installBarDismissed && (
        <div className="sticky bottom-[49px] z-40 lg:hidden border-t border-amber/20 bg-[hsl(150,35%,10%)]">
          {showIOSHint ? (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <p className="flex-1 text-xs text-slate-300 leading-snug">
                Tap <span className="font-bold text-white">Share</span> in Safari, then <span className="font-bold text-white">"Add to Home Screen"</span>
              </p>
              <button onClick={dismissInstallBar} className="text-slate-500 hover:text-white p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-2">
              <Download className="w-4 h-4 text-amber shrink-0" />
              <p className="flex-1 text-xs text-slate-200">
                <span className="font-semibold text-white">Get the app</span> — {EVENT_CONFIG.nav.installBarCopy}
              </p>
              <button
                onClick={handleInstallClick}
                className="text-xs font-semibold text-amber border border-amber/40 rounded-lg px-3 py-1.5 hover:bg-amber/10 active:scale-95 transition-all shrink-0"
              >
                {isIOS ? 'How' : 'Install'}
              </button>
              <button onClick={dismissInstallBar} className="text-slate-500 hover:text-white p-1 -mr-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom tab bar — hidden on desktop */}
      <nav
        className="sticky bottom-0 z-50 border-t border-white/10 lg:hidden"
        style={{backgroundColor: 'hsl(150 35% 16% / 0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)'}}
      >
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
