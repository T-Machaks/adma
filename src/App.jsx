import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/queryClient'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter as Router, Route, Routes, Outlet, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppShell from '@/components/layout/AppShell';
import ConsoleShell from '@/components/layout/ConsoleShell';
import ExhibitorShell from '@/components/layout/ExhibitorShell';
import ConsoleGuard from '@/components/ConsoleGuard';
import OrganizerGuard from '@/components/OrganizerGuard';
import ChatWidget from '@/components/ChatWidget';
import { PWAInstallProvider } from '@/lib/PWAInstallContext';
import { AppSettingsProvider } from '@/lib/AppSettingsContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

// Attendee pages
import Home from '@/pages/Home';
import Exhibitors from '@/pages/Exhibitors';
import SitePlan from '@/pages/SitePlan';
import Meetings from '@/pages/Meetings';
import Schedule from '@/pages/Schedule';
import Announcements from '@/pages/Announcements';
import EventInfo from '@/pages/EventInfo';
import QRResources from '@/pages/QRResources';
import Register from '@/pages/Register';
import AttendeeDashboard from '@/pages/AttendeeDashboard';
import Sponsors from '@/pages/Sponsors';
import Magazine from '@/pages/Magazine';
import ExhibitorDetail from '@/pages/ExhibitorDetail';
import Connect from '@/pages/Connect';
import LiveSessions from '@/pages/LiveSessions';
import LiveRoom from '@/pages/LiveRoom';
import Marketplace from '@/pages/Marketplace';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import Tenders from '@/pages/Tenders';
import TenderDetail from '@/pages/TenderDetail';
import Auctions from '@/pages/Auctions';
import AuctionDetail from '@/pages/AuctionDetail';
import LotDetail from '@/pages/LotDetail';
import Collaborations from '@/pages/Collaborations';
import CollaborationDetail from '@/pages/CollaborationDetail';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Signup from '@/pages/Signup';

// Console pages
import Dashboard from '@/pages/Dashboard';
import Analytics from '@/pages/Analytics';
import AdminPanel from '@/pages/AdminPanel';
import Communications from '@/pages/Communications';
import UsersPanel from '@/pages/console/UsersPanel';
import CheckIn from '@/pages/CheckIn';
import MarketingHub from '@/pages/console/MarketingHub';
import MagazineSectionBuilder from '@/pages/console/MagazineSectionBuilder';
import EventContentManager from '@/pages/console/EventContentManager';
import MarketplaceListings from '@/pages/console/MarketplaceListings';
import ExhibitorApplications from '@/pages/console/ExhibitorApplications';
import PaidListingRequests from '@/pages/console/PaidListingRequests';
import RateCardManager from '@/pages/console/RateCardManager';
import PaymentsLedger from '@/pages/console/PaymentsLedger';
import Registrations from '@/pages/console/Registrations';
import SessionsManager from '@/pages/console/SessionsManager';
import AuctionsManager from '@/pages/console/AuctionsManager';
import EnquiriesPanel from '@/pages/console/EnquiriesPanel';
import ExhibitorApply from '@/pages/ExhibitorApply';
import ConsoleLogin from '@/pages/ConsoleLogin';

// Exhibitor portal pages
import ExhibitorHome from '@/pages/exhibitor/ExhibitorHome';
import ExhibitorMeetings from '@/pages/exhibitor/ExhibitorMeetings';
import ExhibitorAnalytics from '@/pages/exhibitor/ExhibitorAnalytics';
import ExhibitorScanner from '@/pages/exhibitor/ExhibitorScanner';
import ExhibitorTeam from '@/pages/exhibitor/ExhibitorTeam';
import ExhibitorEnquiries from '@/pages/exhibitor/ExhibitorEnquiries';
import ExhibitorMessages from '@/pages/exhibitor/ExhibitorMessages';
import ExhibitorJobs from '@/pages/exhibitor/ExhibitorJobs';
import ExhibitorTenders from '@/pages/exhibitor/ExhibitorTenders';
import ExhibitorCollaborations from '@/pages/exhibitor/ExhibitorCollaborations';
import ExhibitorListings from '@/pages/exhibitor/ExhibitorListings';
import ExhibitorRateCard from '@/pages/exhibitor/ExhibitorRateCard';
import PaymentHistory from '@/pages/PaymentHistory';
import PaymentStub from '@/pages/PaymentStub';
import PaymentReturn from '@/pages/PaymentReturn';
import FileShareUpload from '@/pages/FileShareUpload';

// Layout wrappers (give each shell access to Outlet)
const AttendeeLayout = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

const AttendeeAuthRequired = () => {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    // This is the app's real "startup screen" for a PWA launch — the native OS splash
    // (manifest background_color) is only ever on screen for an instant and can't be a
    // gradient (a solid-color-only field, same on iOS), so this is what's actually
    // visible while the app boots. Matches the home page hero (Home.jsx) exactly: same
    // steel background, same amber radial glow, same transparent-background logo —
    // instead of the plain spinner-on-steel this used to be.
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-steel overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(249,138,26,0.15) 0%, transparent 60%)' }} />
        <div className="absolute top-0 left-1/2 w-64 h-64 rounded-full blur-3xl bg-amber/20" style={{ animation: 'hero-glow 6s ease-in-out infinite' }} />
        <div className="relative flex flex-col items-center gap-4">
          <img src={EVENT_CONFIG.logo.transparent} alt="" className="w-28 h-28 object-contain drop-shadow-2xl" />
          <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading {EVENT_CONFIG.eventName}…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      {/* ── Shorthand redirects (console staff bookmarks) ── */}
      <Route path="/admin"     element={<Navigate to="/console/admin" replace />} />
      <Route path="/analytics" element={<Navigate to="/console/analytics" replace />} />

      {/* ── Auth pages — no shell ── */}
      <Route path="/login"            element={<Login />} />
      <Route path="/signup"           element={<Signup />} />
      <Route path="/console/login"    element={<ConsoleLogin />} />
      <Route path="/exhibitor-apply"   element={<ExhibitorApply />} />
      {/* Retired: the exhibitor-picker demo login. Real exhibitors log in at /login
          with an email the organiser has set for them (Admin Panel → Exhibitor Portal
          Logins) — this redirect just keeps any old bookmarks/emails working. */}
      <Route path="/exhibitor-login"   element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route path="/privacy"          element={<PrivacyPolicy />} />
      <Route path="/payment/stub/:id" element={<PaymentStub />} />
      <Route path="/file-share/:token" element={<FileShareUpload />} />
      <Route path="/payment/return"   element={<PaymentReturn />} />

      {/* ── Management Console (organizer + marketing_partner only) ── */}
      <Route element={<ConsoleGuard />}>
        <Route element={<ConsoleShell />}>
          {/* Shared: organizer + marketing_partner */}
          <Route path="/console"             element={<Dashboard />} />
          <Route path="/console/analytics"   element={<Analytics />} />
          <Route path="/console/marketing"   element={<MarketingHub />} />
          <Route path="/console/magazine-sections" element={<MagazineSectionBuilder />} />

          {/* Organizer-only */}
          <Route element={<OrganizerGuard />}>
            <Route path="/console/event-content"         element={<EventContentManager />} />
            <Route path="/console/marketplace-listings"  element={<MarketplaceListings />} />
            <Route path="/console/sessions"              element={<SessionsManager />} />
            <Route path="/console/auctions"               element={<AuctionsManager />} />
            <Route path="/console/registrations"         element={<Registrations />} />
            <Route path="/console/admin"                 element={<AdminPanel />} />
            <Route path="/console/communications"        element={<Communications />} />
            <Route path="/console/users"                 element={<UsersPanel />} />
            <Route path="/console/check-in"              element={<CheckIn />} />
            <Route path="/console/exhibitor-applications" element={<ExhibitorApplications />} />
            <Route path="/console/paid-listing-requests"  element={<PaidListingRequests />} />
            <Route path="/console/rate-card"              element={<RateCardManager />} />
            <Route path="/console/payments"               element={<PaymentsLedger />} />
            <Route path="/console/enquiries"              element={<EnquiriesPanel />} />
          </Route>
        </Route>
      </Route>

      {/* ── Exhibitor Portal ── */}
      <Route element={<ExhibitorShell />}>
        <Route path="/exhibitor"           element={<ExhibitorHome />} />
        <Route path="/exhibitor/meetings"  element={<ExhibitorMeetings />} />
        <Route path="/exhibitor/scan"      element={<ExhibitorScanner />} />
        <Route path="/exhibitor/analytics" element={<ExhibitorAnalytics />} />
        <Route path="/exhibitor/team"      element={<ExhibitorTeam />} />
        <Route path="/exhibitor/enquiries" element={<ExhibitorEnquiries />} />
        <Route path="/exhibitor/messages"  element={<ExhibitorMessages />} />
        <Route path="/exhibitor/jobs"      element={<ExhibitorJobs />} />
        <Route path="/exhibitor/tenders"   element={<ExhibitorTenders />} />
        <Route path="/exhibitor/collaborations" element={<ExhibitorCollaborations />} />
        <Route path="/exhibitor/listings"  element={<ExhibitorListings />} />
        <Route path="/exhibitor/rate-card" element={<ExhibitorRateCard />} />
        <Route path="/exhibitor/sms-credits" element={<Navigate to="/exhibitor/rate-card" replace />} />
        <Route path="/exhibitor/billing"   element={<PaymentHistory />} />
      </Route>

      {/* ── Attendee PWA ── */}
      <Route element={<AttendeeLayout />}>
        <Route path="/"                   element={<Home />} />
        <Route path="/exhibitors"         element={<Exhibitors />} />
        <Route path="/exhibitors/:id"     element={<ExhibitorDetail />} />
        <Route path="/site-plan"          element={<SitePlan />} />
        <Route path="/meetings"           element={<Meetings />} />
        <Route path="/schedule"           element={<Schedule />} />
        <Route path="/announcements"      element={<Announcements />} />
        <Route path="/event-info"         element={<EventInfo />} />
        <Route path="/qr-resources"       element={<QRResources />} />
        <Route path="/register"           element={<Register />} />
        <Route element={<AttendeeAuthRequired />}>
          <Route path="/attendee-dashboard" element={<AttendeeDashboard />} />
          <Route path="/rate-card"          element={<ExhibitorRateCard />} />
          <Route path="/rate-card/history"  element={<PaymentHistory />} />
        </Route>
        <Route path="/partners"           element={<Sponsors />} />
        <Route path="/magazine"           element={<Magazine />} />
        <Route path="/connect"            element={<Connect />} />
        <Route path="/sessions"           element={<LiveSessions />} />
        <Route path="/sessions/:id"       element={<LiveRoom />} />
        <Route path="/marketplace"        element={<Marketplace />} />
        <Route path="/jobs"               element={<Jobs />} />
        <Route path="/jobs/:id"           element={<JobDetail />} />
        <Route path="/tenders"            element={<Tenders />} />
        <Route path="/tenders/:id"        element={<TenderDetail />} />
        <Route path="/auctions"           element={<Auctions />} />
        <Route path="/auctions/:id"       element={<AuctionDetail />} />
        <Route path="/lots/:id"           element={<LotDetail />} />
        <Route path="/collaborations"     element={<Collaborations />} />
        <Route path="/collaborations/:id" element={<CollaborationDetail />} />
        <Route path="*"                   element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <PWAInstallProvider>
      <AuthProvider>
        <AppSettingsProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
            <ChatWidget />
          </QueryClientProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </PWAInstallProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
