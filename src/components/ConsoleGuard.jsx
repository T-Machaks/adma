import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function ConsoleGuard() {
  const { isAuthenticated, isLoadingAuth, authChecked, hasConsoleAccess } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-steel">
        <div className="w-10 h-10 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/console/login" replace state={{ from: '/console', reason: 'auth_required' }} />;
  }

  if (!hasConsoleAccess()) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-steel px-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The Management Console is only available to {EVENT_CONFIG.eventName} organizers and marketing partners.
          </p>
          <a href="/" className="inline-block w-full py-2.5 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Back to Attendee App
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
