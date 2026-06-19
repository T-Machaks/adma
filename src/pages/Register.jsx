import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Registration } from '@/api/entities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, User, Building2, Mail, Phone, Tag, Ticket, Shield, ChevronRight, Users, Star, Mic, Crown, Briefcase, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import SocialAuthButtons, { SocialDivider } from '@/components/SocialAuthButtons';

const ROLE_TYPES = [
  { value: 'Attendee', icon: User, color: 'bg-blue-500', desc: 'Industry visitor & buyer' },
  { value: 'Exhibitor', icon: Building2, color: 'bg-amber-500', desc: 'Company with a booth' },
  { value: 'Sponsor', icon: Star, color: 'bg-yellow-500', desc: 'Event sponsor partner' },
  { value: 'Speaker', icon: Mic, color: 'bg-purple-500', desc: 'Conference presenter' },
  { value: 'VIP Guest', icon: Crown, color: 'bg-rose-500', desc: 'Special invite or dignitary' },
];

const TICKET_MAP = {
  Attendee: ['General Admission', 'VIP Pass'],
  Exhibitor: ['Exhibitor Pass'],
  Sponsor: ['VIP Pass', 'Exhibitor Pass'],
  Speaker: ['Speaker Pass'],
  'VIP Guest': ['VIP Pass'],
};

const BADGE_MAP = {
  Attendee: 'Visitor',
  Exhibitor: 'Exhibitor',
  Sponsor: 'Sponsor',
  Speaker: 'Speaker',
  'VIP Guest': 'VIP',
};

export default function Register() {
  const { setSession } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [socialError, setSocialError] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company: '',
    role_type: '', ticket_type: '', badge_category: '',
    notes: '', day1: true, day2: false, day3: false,
    otp_code: '', otp_verified: false,
  });
  const [enteredOtp, setEnteredOtp] = useState('');
  const [created, setCreated] = useState(null);
  const [duplicateError, setDuplicateError] = useState(false);

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => Registration.list('-created_date'),
  });

  const mutation = useMutation({
    mutationFn: (data) => Registration.create(data),
    onSuccess: (rec) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setCreated(rec);
      setStep(4);
    },
  });

  const set = (k, v) => {
    if (k === 'email') setDuplicateError(false);
    setForm(f => ({ ...f, [k]: v }));
  };

  const selectRole = (role) => {
    const tickets = TICKET_MAP[role];
    set('role_type', role);
    set('ticket_type', tickets[0]);
    set('badge_category', BADGE_MAP[role]);
  };

  const handleSubmit = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    mutation.mutate({ ...form, otp_code: otp, otp_verified: false });
  };

  const verifyOtp = () => {
    if (enteredOtp === created?.otp_code) {
      Registration.update(created.id, { otp_verified: true });
      setStep(5);
    }
  };

  const total = registrations.length;
  const byRole = ROLE_TYPES.map(r => ({ ...r, count: registrations.filter(reg => reg.role_type === r.value).length }));
  const confirmed = registrations.filter(r => r.status === 'Confirmed' || r.status === 'Checked In').length;

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Event Registration</h1>
      <p className="text-muted-foreground text-sm mb-4">Register for MineCon 2026 — get a badge &amp; ticket to attend the exhibition.</p>

      {/* Free account callout */}
      <Link
        to="/signup"
        className="flex items-center gap-3 p-3 rounded-xl border border-amber/40 bg-amber/5 hover:bg-amber/10 transition-colors mb-5 group"
      >
        <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Just need a platform account?</p>
          <p className="text-xs text-muted-foreground">Create a free account to book meetings &amp; connect with exhibitors — no ticket required.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-amber flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Admin summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-2xl font-bold text-amber">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-2xl font-bold text-emerald-500">{confirmed}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="font-heading text-2xl font-bold text-blue-500">{registrations.filter(r => r.role_type === 'Attendee').length}</p>
          <p className="text-xs text-muted-foreground">Attendees</p>
        </div>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="flex items-center gap-1 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-amber' : 'bg-muted'}`} />
          ))}
        </div>
      )}

      {/* Step 1 — Role selection */}
      {step === 1 && (
        <div>
          {/* Social sign-in to pre-fill form */}
          <SocialAuthButtons
            onSuccess={(userData) => {
              setSession(userData);
              set('full_name', userData.full_name || '');
              set('email', userData.email || '');
              setSocialError('');
            }}
            onError={setSocialError}
          />
          {socialError && (
            <p className="mt-2 text-xs text-destructive">{socialError}</p>
          )}
          <SocialDivider />

          <p className="text-sm font-semibold mb-4">Select your registration type:</p>
          <div className="space-y-3">
            {ROLE_TYPES.map(r => {
              const Icon = r.icon;
              return (
                <button key={r.value} onClick={() => { selectRole(r.value); setStep(2); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-amber ${form.role_type === r.value ? 'border-amber bg-amber/5' : 'border-border bg-card'}`}>
                  <div className={`w-10 h-10 ${r.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.value}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 — Personal details */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold mb-2">Your details — <span className="text-amber">{form.role_type}</span></p>
          <Field icon={User} placeholder="Full name *" value={form.full_name} onChange={v => set('full_name', v)} required />
          <Field icon={Mail} placeholder="Email address *" type="email" value={form.email} onChange={v => set('email', v)} required />
          <Field icon={Phone} placeholder="Phone number" type="tel" value={form.phone} onChange={v => set('phone', v)} />
          <Field icon={Building2} placeholder="Company / Organisation" value={form.company} onChange={v => set('company', v)} />

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ticket Type</p>
            <div className="flex gap-2 flex-wrap">
              {TICKET_MAP[form.role_type]?.map(t => (
                <button key={t} onClick={() => set('ticket_type', t)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.ticket_type === t ? 'bg-amber text-white border-amber' : 'border-border hover:border-amber/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Attendance Days</p>
            <div className="flex gap-2">
              {[['day1', 'Day 1'], ['day2', 'Day 2'], ['day3', 'Day 3']].map(([key, label]) => (
                <button key={key} onClick={() => set(key, !form[key])}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${form[key] ? 'bg-steel text-white border-steel' : 'border-border hover:border-steel/50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Badge Category</p>
            <div className="px-3 py-2 bg-muted rounded-lg text-sm font-medium text-foreground">
              {form.badge_category}
            </div>
          </div>

          <textarea placeholder="Special requirements or notes (optional)" value={form.notes}
            onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none" />

          {duplicateError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">This email is already registered. Each person may only register once.</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Back</button>
            <button
              onClick={() => {
                const exists = registrations.some(r => r.email?.toLowerCase() === form.email?.toLowerCase());
                if (exists) { setDuplicateError(true); return; }
                setStep(3);
              }}
              disabled={!form.full_name || !form.email}
              className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
              Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold mb-2">Review your registration</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {[
              ['Registration Type', form.role_type],
              ['Full Name', form.full_name],
              ['Email', form.email],
              ['Phone', form.phone || '—'],
              ['Company', form.company || '—'],
              ['Ticket', form.ticket_type],
              ['Badge', form.badge_category],
              ['Days', [form.day1 && 'Day 1', form.day2 && 'Day 2', form.day3 && 'Day 3'].filter(Boolean).join(', ') || 'Day 1'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Edit</button>
            <button onClick={handleSubmit} disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              {mutation.isPending ? 'Submitting…' : 'Confirm Registration'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — OTP verification */}
      {step === 4 && (
        <div className="text-center space-y-5">
          <div className="w-16 h-16 bg-amber/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-amber" />
          </div>
          <div>
            <p className="font-semibold text-lg">Verification Code</p>
            <p className="text-sm text-muted-foreground mt-1">Your demo OTP code is: <span className="font-bold text-amber font-mono">{created?.otp_code}</span></p>
            <p className="text-xs text-muted-foreground mt-1">(In production, this would be sent to {created?.email})</p>
          </div>
          <input value={enteredOtp} onChange={e => setEnteredOtp(e.target.value)}
            placeholder="Enter 6-digit code"
            className="w-full text-center text-xl font-mono tracking-widest px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber" maxLength={6} />
          <button onClick={verifyOtp} disabled={enteredOtp.length < 6}
            className="w-full py-3 rounded-xl bg-amber text-white font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
            Verify & Complete
          </button>
          <button onClick={() => setStep(5)} className="text-xs text-muted-foreground underline">Skip verification (demo)</button>
        </div>
      )}

      {/* Step 5 — Confirmed */}
      {step === 5 && (
        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold">You're Registered!</p>
            <p className="text-sm text-muted-foreground mt-2">Welcome to MineCon 2026, <strong>{created?.full_name}</strong>.</p>
            <p className="text-sm text-muted-foreground mt-1">Badge type: <span className="font-semibold text-amber">{created?.badge_category}</span></p>
            <p className="text-xs text-muted-foreground mt-3">A confirmation will be sent to {created?.email}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-left space-y-1.5">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Next Steps</p>
            <p className="text-xs text-muted-foreground">✓ Add MineCon to your calendar</p>
            <p className="text-xs text-muted-foreground">✓ Browse the exhibitor directory</p>
            <p className="text-xs text-muted-foreground">✓ Book meetings with exhibitors</p>
            <p className="text-xs text-muted-foreground">✓ Review the event schedule</p>
          </div>
          <button onClick={() => { setForm({ full_name: '', email: '', phone: '', company: '', role_type: '', ticket_type: '', badge_category: '', notes: '', day1: true, day2: false, day3: false, otp_code: '', otp_verified: false }); setStep(1); setCreated(null); }}
            className="w-full py-3 rounded-xl bg-amber text-white font-semibold hover:opacity-90 transition-opacity">
            Register Another Person
          </button>
        </div>
      )}

      {/* Admin registrations list */}
      {registrations.length > 0 && step === 1 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="font-heading text-base font-bold uppercase tracking-wide">Recent Registrations</p>
            <span className="text-xs text-muted-foreground">{total} total</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {byRole.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.value} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 ${r.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-heading font-bold">{r.count}</p>
                    <p className="text-[10px] text-muted-foreground">{r.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {registrations.slice(0, 10).map(r => (
              <div key={r.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.company || r.email} · {r.role_type}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  r.status === 'Confirmed' || r.status === 'Checked In' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {r.status || 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, type = 'text', required }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)} required={required}
        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber" />
    </div>
  );
}
