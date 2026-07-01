import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Shield } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

export default function OrganizerGuard() {
  const { user, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-steel">
        <div className="w-10 h-10 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/console/login" replace />;
  }

  if (user.role !== 'organizer' && user.role !== 'superadmin') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-2">Organizer Access Only</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This section is restricted to {EVENT_CONFIG.eventName} organizers.
          </p>
          <a href="/console" className="inline-block w-full py-2.5 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
