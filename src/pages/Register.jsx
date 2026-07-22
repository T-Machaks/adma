import { Link } from 'react-router-dom';
import { ExternalLink, UserPlus, LogIn, QrCode, CheckCircle, Ticket } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

// Item 3: physical event ticketing/registration is handled entirely on the official
// Agri-Show site, not duplicated here. This page only offers the free digital platform
// account (used for the QR account-holder badge) and a redirect for physical tickets.
export default function Register() {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const redirectUrl = settings.physicalEventRegistrationUrl || 'https://agrishow.co.zw/';

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Registration</h1>
      <p className="text-muted-foreground text-sm mb-6">Get set up for {EVENT_CONFIG.eventFullName} — physical show tickets and your digital platform account.</p>

      {/* Physical event registration — redirects to the official show site */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-amber/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-amber" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm">Physical Event Registration</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entry passes and tickets for the physical {EVENT_CONFIG.eventName} are handled on the official show site.
            </p>
          </div>
        </div>
        <a
          href={redirectUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-amber text-white text-sm font-semibold px-4 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all"
        >
          Register for the Physical Show <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Digital platform account — QR account-holder badge lives here */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-steel/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <QrCode className="w-5 h-5 text-steel" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm">Digital Platform Account</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a free account to browse exhibitors, book meetings, and get your QR account-holder badge — no physical ticket required.
            </p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">You're signed in as {user.full_name || user.email}</p>
              <Link to="/qr-resources" className="text-xs text-amber font-medium hover:underline">View your QR badge →</Link>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Link
              to="/signup"
              className="flex-1 flex items-center justify-center gap-2 bg-amber text-white text-sm font-semibold px-4 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Create Account
            </Link>
            <Link
              to="/login"
              className="flex-1 flex items-center justify-center gap-2 border border-border text-sm font-semibold px-4 py-3 rounded-xl hover:bg-muted transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
