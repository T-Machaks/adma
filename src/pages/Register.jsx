import { Link } from 'react-router-dom';
import { UserPlus, LogIn, QrCode, CheckCircle, Ticket, Building2, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { useSEO } from '@/lib/useSEO';

// Physical event registration is handled entirely separately from ADMA Digital (not
// duplicated or linked out from here) — see the notice below. This page only offers the
// free digital platform account (used for the QR account-holder badge).
export default function Register() {
  useSEO({
    title: 'Register',
    description: 'Create your free ADMA Digital account — get your QR badge, book meetings, and access exhibitor information for the ADMA Agri Show.',
    path: '/register',
  });
  const { user } = useAuth();

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Registration</h1>
      <p className="text-muted-foreground text-sm mb-6">Get set up for {EVENT_CONFIG.eventFullName} — your digital platform account.</p>

      {/* Physical event registration — closed pending the 2027 site plan */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm flex items-center gap-2">
              Physical Event Registration
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                <Clock className="w-2.5 h-2.5" /> Closed
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              The physical exhibition event is separate from the digital platform and will
              continue to be handled separately, as before. Exhibitors will be notified
              directly as soon as the 2027 site plan is ready and registration opens.
            </p>
          </div>
        </div>
      </div>

      {/* Virtual exhibitor registration — distinct from the physical event registration above */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm">Virtual Exhibitor Registration</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply for a virtual presence on ADMA Digital — subject to approval.
            </p>
          </div>
        </div>
        <Link
          to="/exhibitor-apply"
          className="flex items-center justify-center gap-2 bg-card border border-border text-sm font-semibold px-4 py-3 rounded-xl hover:bg-muted active:scale-95 transition-all"
        >
          Register as a Virtual Exhibitor <ArrowRight className="w-4 h-4" />
        </Link>
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

      <p className="text-xs text-muted-foreground text-center mt-6">
        <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
