import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingRequest, Exhibitor } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Calendar, Clock, CheckCircle, Building2, User, Mail, Phone, FileText, Lock, LogIn, UserPlus } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

const DATES = ['14 October 2026', '15 October 2026', '16 October 2026'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const empty = { visitor_name: '', visitor_company: '', visitor_email: '', visitor_phone: '', exhibitor_name: '', exhibitor_id: '', exhibitor_booth: '', preferred_date: '', preferred_time: '', reason: '' };

function AccountGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 bg-amber/10 rounded-full flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-amber" />
      </div>
      <h2 className="font-heading text-2xl font-bold mb-2">Account Required</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-xs">
        Please sign in or create a free account to book meetings. Your details will be filled in automatically.
      </p>
      <div className="flex gap-3">
        <Link
          to="/login"
          className="flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber/90 transition-colors"
        >
          <LogIn className="w-4 h-4" /> Sign In
        </Link>
        <Link
          to="/register"
          className="flex items-center gap-2 border border-border bg-card text-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Create Account
        </Link>
      </div>
    </div>
  );
}

export default function Meetings() {
  const location = useLocation();
  const prefill = location.state?.exhibitor;
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    ...empty,
    exhibitor_name: prefill?.name || '',
    exhibitor_id: prefill?.id || '',
    exhibitor_booth: prefill?.booth || '',
  });
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill visitor details from account
  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        visitor_name: user.full_name || f.visitor_name,
        visitor_email: user.email || f.visitor_email,
        visitor_company: user.company || f.visitor_company,
      }));
    }
  }, [user]);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list('-created_date'),
    enabled: isAuthenticated,
  });

  const mutation = useMutation({
    mutationFn: (data) => MeetingRequest.create({ ...data, status: 'Pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSubmitted(true);
    },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleExhibitorChange = (name) => {
    const ex = exhibitors.find(e => e.name === name);
    set('exhibitor_name', name);
    set('exhibitor_id', ex?.id || '');
    if (ex) set('exhibitor_booth', ex.booth || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (!isAuthenticated) return <AccountGate />;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Meeting Requested!</h2>
        <p className="text-muted-foreground text-sm mb-1">Your request to meet <strong>{form.exhibitor_name}</strong> has been submitted.</p>
        <p className="text-muted-foreground text-sm mb-6">{form.preferred_date} at {form.preferred_time}</p>
        <button
          onClick={() => { setForm({ ...empty, exhibitor_name: '', exhibitor_id: '', exhibitor_booth: '', visitor_name: user?.full_name || '', visitor_email: user?.email || '', visitor_company: user?.company || '' }); setSubmitted(false); }}
          className="bg-amber text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-dark transition-colors"
        >
          Book Another Meeting
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Book a Meeting</h1>
      <p className="text-muted-foreground text-sm mb-5">Request a one-on-one meeting with an exhibitor at MineCon 2026.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-5">
        {/* Account details — locked */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Your Details
            <span className="ml-auto text-[10px] normal-case font-normal">From your account</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LockedField icon={User} label="Full name" value={form.visitor_name} />
            <LockedField icon={Mail} label="Email address" value={form.visitor_email} />
            <LockedField icon={Building2} label="Company" value={form.visitor_company || '—'} />
            {/* Phone is not on the account — still editable */}
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={form.visitor_phone}
                onChange={e => set('visitor_phone', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Exhibitor */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Exhibitor</p>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
              value={form.exhibitor_name}
              onChange={e => handleExhibitorChange(e.target.value)}
              required
            >
              <option value="">Select exhibitor *</option>
              {exhibitors.map(ex => (
                <option key={ex.id} value={ex.name}>{ex.name}{ex.booth ? ` — Booth ${ex.booth}` : ''}</option>
              ))}
            </select>
          </div>
          {form.exhibitor_booth && (
            <p className="text-xs text-muted-foreground mt-1 pl-1">📍 Booth: {form.exhibitor_booth}</p>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Date & time */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Preferred Slot</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
                value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} required>
                <option value="">Date *</option>
                {DATES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
                value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} required>
                <option value="">Time *</option>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <textarea
            placeholder="Reason for meeting / what to discuss"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            rows={3}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-amber hover:opacity-90 text-white font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit Meeting Request'}
        </button>
      </form>
    </div>
  );
}

function LockedField({ icon: Icon, label, value }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <div className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-border bg-muted text-sm text-foreground truncate">
        {value || <span className="text-muted-foreground">{label}</span>}
      </div>
      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
    </div>
  );
}
