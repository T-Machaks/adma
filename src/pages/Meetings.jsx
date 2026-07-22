import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingRequest, Exhibitor } from '@/api/entities';
import { notifyMeeting } from '@/api/notify';
import { useAuth } from '@/lib/AuthContext';
import { Calendar as CalendarIcon, Clock, CheckCircle, Building2, User, Mail, Phone, FileText, Lock, LogIn, UserPlus, CalendarDays, ClipboardList, AlertCircle, XCircle } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function parseDate(str) {
  const d = str ? new Date(str) : null;
  return d && !isNaN(d) ? d : null;
}

const empty = { visitor_name: '', visitor_company: '', visitor_email: '', visitor_phone: '', exhibitor_name: '', exhibitor_id: '', exhibitor_booth: '', preferred_date: '', preferred_time: '', reason: '' };

const STATUS_STYLE = {
  Pending:   { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',   icon: AlertCircle,    label: 'Pending'   },
  Confirmed: { pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',   icon: CheckCircle,    label: 'Confirmed' },
  Cancelled: { pill: 'bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-300',     icon: XCircle,        label: 'Cancelled' },
  Rejected:  { pill: 'bg-slate-100 text-slate-600 dark:bg-slate-800    dark:text-slate-400',   icon: XCircle,        label: 'Rejected'  },
};

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
        <Link to="/login" className="flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber/90 transition-colors">
          <LogIn className="w-4 h-4" /> Sign In
        </Link>
        <Link to="/register" className="flex items-center gap-2 border border-border bg-card text-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-muted transition-colors">
          <UserPlus className="w-4 h-4" /> Create Account
        </Link>
      </div>
    </div>
  );
}

function MyMeetings({ email }) {
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['my-meetings', email],
    queryFn: () => MeetingRequest.filter({ visitor_email: email }),
    enabled: !!email,
  });

  const sorted = [...meetings].sort((a, b) => {
    const da = new Date(`${a.preferred_date} ${a.preferred_time}`);
    const db = new Date(`${b.preferred_date} ${b.preferred_time}`);
    return da - db;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="font-semibold text-muted-foreground">No meetings scheduled</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Book a meeting to connect with exhibitors at {EVENT_CONFIG.eventFullName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map(m => {
        const style = STATUS_STYLE[m.status] ?? STATUS_STYLE.Pending;
        const Icon = style.icon;
        return (
          <div key={m.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-4.5 h-4.5 text-amber" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight truncate">{m.exhibitor_name}</p>
                  {m.exhibitor_booth && (
                    <p className="text-xs text-muted-foreground">Booth {m.exhibitor_booth}</p>
                  )}
                </div>
              </div>
              <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${style.pill}`}>
                <Icon className="w-3 h-3" /> {style.label}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5" /> {m.preferred_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {m.preferred_time}
              </span>
            </div>

            {m.reason && (
              <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2 leading-relaxed line-clamp-2">
                {m.reason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Meetings() {
  const location = useLocation();
  const prefill = location.state?.exhibitor;
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [tab, setTab] = useState('book');
  const [form, setForm] = useState({
    ...empty,
    preferred_date: formatDate(startOfToday()),
    exhibitor_name: prefill?.name || '',
    exhibitor_id:   prefill?.id   || '',
    exhibitor_booth: prefill?.booth || '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        visitor_name:    user.full_name || f.visitor_name,
        visitor_email:   user.email     || f.visitor_email,
        visitor_company: user.company   || f.visitor_company,
      }));
    }
  }, [user]);

  // Switch to My Meetings after successful booking
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => { setSubmitted(false); setTab('mine'); }, 2500);
      return () => clearTimeout(t);
    }
  }, [submitted]);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list('-created_date'),
    enabled: isAuthenticated,
  });

  const mutation = useMutation({
    mutationFn: (data) => MeetingRequest.create({ ...data, status: 'Pending' }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['my-meetings', user?.email] });
      setSubmitted(true);
      notifyMeeting(created, 'created');
    },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleExhibitorChange = (name) => {
    const ex = exhibitors.find(e => e.name === name);
    set('exhibitor_name', name);
    set('exhibitor_id',   ex?.id || '');
    if (ex) set('exhibitor_booth', ex.booth || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (!isAuthenticated) return <AccountGate />;

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Meetings</h1>
      <p className="text-muted-foreground text-sm mb-5">Book one-on-one meetings with exhibitors at {EVENT_CONFIG.eventFullName}.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-5">
        <button
          onClick={() => setTab('book')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'book' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CalendarDays className="w-4 h-4" /> Book a Meeting
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === 'mine' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ClipboardList className="w-4 h-4" /> My Meetings
        </button>
      </div>

      {/* ── My Meetings tab ── */}
      {tab === 'mine' && <MyMeetings email={user?.email} />}

      {/* ── Book tab ── */}
      {tab === 'book' && (
        submitted ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-1">Meeting Requested!</h2>
            <p className="text-muted-foreground text-sm mb-1">Your request to meet <strong>{form.exhibitor_name}</strong> has been submitted.</p>
            <p className="text-muted-foreground text-sm">{form.preferred_date} at {form.preferred_time}</p>
            <p className="text-xs text-muted-foreground/60 mt-4">Redirecting to your meetings…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-5">
            {/* Account details — locked */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Your Details
                <span className="ml-auto text-[10px] normal-case font-normal">From your account</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LockedField icon={User}     label="Full name"      value={form.visitor_name} />
                <LockedField icon={Mail}     label="Email address"  value={form.visitor_email} />
                <LockedField icon={Building2} label="Company"       value={form.visitor_company || '—'} />
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="+263 77 123 4567 (optional)"
                    autoComplete="off"
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
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />Exhibitor
              </p>
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

            {/* Date & time — any day of the year is bookable; past dates are disabled */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />Preferred Slot
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm text-left focus:outline-none focus:ring-2 focus:ring-amber"
                    >
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      {form.preferred_date || <span className="text-muted-foreground">Date *</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseDate(form.preferred_date)}
                      defaultMonth={parseDate(form.preferred_date) || startOfToday()}
                      disabled={{ before: startOfToday() }}
                      onSelect={d => d && set('preferred_date', formatDate(d))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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
        )
      )}
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
