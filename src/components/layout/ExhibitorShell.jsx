import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Store, Calendar, BarChart2, LogOut, ChevronLeft, ChevronDown, ScanLine, Users, Inbox, MessageCircle, Briefcase, FileText, Handshake, LayoutList, DollarSign, Receipt, MessageSquare, Loader2, Eye, Sparkles } from 'lucide-react';
import EventLogo from './EventLogo.jsx';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { SmsCredits, Exhibitor } from '@/api/entities';
import { getStandTier, isPromoActive } from '@/lib/standTiers';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

// Kept as individual top-level pills — either high-frequency (checked most days) or
// distinct enough not to bury in a group.
const exhibitorNav = [
  { path: '/exhibitor',           label: 'My Booth',   icon: Store,     exact: true },
  { path: '/exhibitor/meetings',  label: 'Meetings',   icon: Calendar },
  { path: '/exhibitor/scan',      label: 'Scan',       icon: ScanLine },
  { path: '/exhibitor/analytics', label: 'Analytics',  icon: BarChart2 },
  { path: '/exhibitor/team',      label: 'Team',       icon: Users },
  { path: '/exhibitor/enquiries', label: 'Enquiries',  icon: Inbox },
  { path: '/exhibitor/messages',  label: 'Messages',   icon: MessageCircle },
];

// Grouped under dropdown pills so the whole bar fits a normal desktop viewport without
// horizontal scrolling — each group here collapses 3-4 items into one pill.
const navGroups = [
  {
    label: 'Marketplace',
    icon: LayoutList,
    items: [
      { path: '/exhibitor/jobs',           label: 'Jobs',           icon: Briefcase },
      { path: '/exhibitor/tenders',        label: 'Tenders',        icon: FileText },
      { path: '/exhibitor/collaborations', label: 'Collaborations', icon: Handshake },
      { path: '/exhibitor/listings',       label: 'My Listings',    icon: LayoutList },
    ],
  },
  {
    label: 'Billing',
    icon: DollarSign,
    items: [
      { path: '/exhibitor/rate-card', label: 'Rate Card', icon: DollarSign },
      { path: '/exhibitor/billing',   label: 'Billing',   icon: Receipt },
    ],
  },
];

export default function ExhibitorShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoadingAuth, logout, exitImpersonation } = useAuth();
  const isHome = location.pathname === '/exhibitor';

  const [exitingImpersonation, setExitingImpersonation] = useState(false);
  const handleExitImpersonation = async () => {
    setExitingImpersonation(true);
    const result = await exitImpersonation();
    if (result.success) {
      navigate(result.redirectTo || '/console/admin');
    } else {
      setExitingImpersonation(false);
      window.alert(result.error || 'Could not restore your organizer session.');
    }
  };

  // One-click SMS Dashboard access from anywhere in the portal, not just My Booth/Rate
  // Card. Smart pill: opens the workspace directly once one exists, otherwise sends the
  // exhibitor to Rate Card to buy a bundle first (same summary query as those pages —
  // react-query dedupes it, so this doesn't add an extra request on pages that already
  // fetch it).
  const { data: smsSummary } = useQuery({
    queryKey: ['sms-credits-summary'],
    queryFn: () => SmsCredits.summary(),
    enabled: !!user && user.role === 'exhibitor',
  });
  const smsOpenMutation = useMutation({
    mutationFn: () => SmsCredits.open(),
    onSuccess: ({ url }) => { window.location.href = url; },
  });

  // Launch promo banner — same queryKey as ExhibitorHome.jsx's own fetch, so react-query
  // dedupes this against whatever the actual page underneath also needs, no extra request
  // in practice.
  const { settings } = useAppSettings();
  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list(),
    enabled: !!user && user.role === 'exhibitor',
  });
  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  );
  const promoActive = isPromoActive(settings) && myBooth && getStandTier(myBooth) !== 'Premium';
  const promoDaysLeft = promoActive ? Math.ceil((new Date(settings.promoTierOverrideUntil) - new Date()) / (24 * 60 * 60 * 1000)) : 0;

  if (isLoadingAuth) return null;
  if (!user || user.role !== 'exhibitor') {
    return <Navigate to="/login" replace />;
  }

  const isActive = (path, exact) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {user.impersonating && (
        <div className="bg-amber text-white px-3 sm:px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium flex-wrap">
          <Eye className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Managing as <span className="font-bold">{user.company}</span> — changes here affect their live booth</span>
          <button
            onClick={handleExitImpersonation}
            disabled={exitingImpersonation}
            className="ml-1 underline underline-offset-2 font-bold hover:no-underline disabled:opacity-60"
          >
            {exitingImpersonation ? 'Exiting…' : 'Exit'}
          </button>
        </div>
      )}
      {promoActive && (
        <div className="bg-emerald-600 text-white px-3 sm:px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium flex-wrap text-center">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            You're on our launch promo — free Premium features (job/tender postings, full gallery, analytics) for{' '}
            <span className="font-bold">{promoDaysLeft} more day{promoDaysLeft === 1 ? '' : 's'}</span>, until {new Date(settings.promoTierOverrideUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </span>
        </div>
      )}
      <header className="sticky top-0 z-50 bg-steel border-b border-white/10">
        <div className="w-full px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
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

          <nav className="flex items-center gap-px mx-auto overflow-x-auto scrollbar-none">
            {exhibitorNav.map(({ path, label, icon: Icon, exact }) => (
              <Link
                key={path}
                to={path}
                title={label}
                className={`flex items-center gap-1 p-2 lg:px-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] font-medium transition-all duration-150 active:scale-95 select-none touch-manipulation flex-shrink-0 ${
                  isActive(path, exact)
                    ? 'bg-amber text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">{label}</span>
              </Link>
            ))}

            {navGroups.map(group => {
              const groupActive = group.items.some(i => isActive(i.path));
              return (
                <DropdownMenu key={group.label}>
                  <DropdownMenuTrigger
                    title={group.label}
                    className={`flex items-center gap-1 p-2 lg:px-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] font-medium transition-all duration-150 active:scale-95 select-none touch-manipulation flex-shrink-0 outline-none ${
                      groupActive
                        ? 'bg-amber text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <group.icon className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
                    <span className="hidden lg:inline whitespace-nowrap">{group.label}</span>
                    <ChevronDown className="hidden lg:inline w-3 h-3 flex-shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {group.items.map(({ path, label, icon: Icon }) => (
                      <DropdownMenuItem key={path} asChild>
                        <Link to={path} className={isActive(path) ? 'font-semibold text-amber' : ''}>
                          <Icon className="w-4 h-4" /> {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {smsSummary?.hasWorkspace ? (
              <button
                onClick={() => smsOpenMutation.mutate()}
                disabled={smsOpenMutation.isPending}
                title="Open My SMS Dashboard"
                className="flex items-center gap-1 p-2 lg:px-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] font-medium transition-all duration-150 active:scale-95 select-none touch-manipulation flex-shrink-0 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-60"
              >
                {smsOpenMutation.isPending
                  ? <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0 animate-spin" />
                  : <MessageSquare className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0" />}
                <span className="hidden lg:inline whitespace-nowrap">SMS Dashboard</span>
              </button>
            ) : (
              <Link
                to="/exhibitor/rate-card"
                title="Buy SMS credits to activate your SMS Dashboard"
                className={`flex items-center gap-1 p-2 lg:px-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] font-medium transition-all duration-150 active:scale-95 select-none touch-manipulation flex-shrink-0 ${
                  isActive('/exhibitor/rate-card')
                    ? 'bg-amber text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 lg:w-3.5 lg:h-3.5 flex-shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">SMS Dashboard</span>
              </Link>
            )}

            <div className="w-px h-5 bg-white/20 mx-0.5 hidden lg:block flex-shrink-0" />

            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1 p-2 lg:px-1.5 lg:py-1 rounded-lg text-xs lg:text-[11px] text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 touch-manipulation flex-shrink-0"
              title="Log out"
            >
              <LogOut className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
              <span className="hidden lg:inline whitespace-nowrap">Log out</span>
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
