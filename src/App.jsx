import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/queryClient'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter as Router, Route, Routes, Outlet } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppShell from '@/components/layout/AppShell';
import ConsoleShell from '@/components/layout/ConsoleShell';
import ExhibitorShell from '@/components/layout/ExhibitorShell';
import ConsoleGuard from '@/components/ConsoleGuard';
import InstallPromptModal from '@/components/InstallPromptModal';
import ChatWidget from '@/components/ChatWidget';
import { PWAInstallProvider } from '@/lib/PWAInstallContext';
import { AppSettingsProvider } from '@/lib/AppSettingsContext';

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
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Signup from '@/pages/Signup';

// Console pages
import Dashboard from '@/pages/Dashboard';
import Analytics from '@/pages/Analytics';
import AdminPanel from '@/pages/AdminPanel';
import Communications from '@/pages/Communications';
import UsersPanel from '@/pages/console/UsersPanel';
import CheckIn from '@/pages/CheckIn';
import MarketingHub from '@/pages/console/MarketingHub';

// Exhibitor portal pages
import ExhibitorHome from '@/pages/exhibitor/ExhibitorHome';
import ExhibitorAnalytics from '@/pages/exhibitor/ExhibitorAnalytics';
import ExhibitorScanner from '@/pages/exhibitor/ExhibitorScanner';
import ExhibitorTeam from '@/pages/exhibitor/ExhibitorTeam';

// Layout wrappers (give each shell access to Outlet)
const AttendeeLayout = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-steel">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading MineCon…</p>
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
      {/* ── Auth pages — no shell ── */}
      <Route path="/login"            element={<Login />} />
      <Route path="/signup"           element={<Signup />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />

      {/* ── Management Console (organizer + marketing_partner only) ── */}
      <Route element={<ConsoleGuard />}>
        <Route element={<ConsoleShell />}>
          <Route path="/console"                  element={<Dashboard />} />
          <Route path="/console/analytics"        element={<Analytics />} />
          <Route path="/console/admin"            element={<AdminPanel />} />
          <Route path="/console/communications"   element={<Communications />} />
          <Route path="/console/registrations"    element={<AdminPanel />} />
          <Route path="/console/users"            element={<UsersPanel />} />
          <Route path="/console/check-in"         element={<CheckIn />} />
          <Route path="/console/marketing"        element={<MarketingHub />} />
        </Route>
      </Route>

      {/* ── Exhibitor Portal ── */}
      <Route element={<ExhibitorShell />}>
        <Route path="/exhibitor"           element={<ExhibitorHome />} />
        <Route path="/exhibitor/meetings"  element={<Meetings />} />
        <Route path="/exhibitor/scan"      element={<ExhibitorScanner />} />
        <Route path="/exhibitor/analytics" element={<ExhibitorAnalytics />} />
        <Route path="/exhibitor/team"      element={<ExhibitorTeam />} />
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
        <Route path="/attendee-dashboard" element={<AttendeeDashboard />} />
        <Route path="/sponsors"           element={<Sponsors />} />
        <Route path="/magazine"           element={<Magazine />} />
        <Route path="/connect"            element={<Connect />} />
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
            <InstallPromptModal />
            <ChatWidget />
          </QueryClientProvider>
        </AppSettingsProvider>
      </AuthProvider>
    </PWAInstallProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
