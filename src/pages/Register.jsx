import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Registration } from '@/api/entities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, User, Building2, Mail, Phone, Ticket, Shield,
  ChevronRight, Star, Mic, Crown, AlertCircle, UserPlus, ArrowRight,
  Plus, Minus, CreditCard, Smartphone, Loader2, Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import SocialAuthButtons, { SocialDivider } from '@/components/SocialAuthButtons';

// ── Pricing ────────────────────────────────────────────────────────────────
const TICKET_PRICES = {
  'General Admission': 50,
  'VIP Pass': 200,
  'Exhibitor Pass': 0,   // set by tier
  'Speaker Pass': 0,
};

const EXHIBITOR_TIERS = [
  { value: 'Diamond', price: 5000, border: 'border-cyan-400',   ring: 'ring-cyan-400',   label: 'text-cyan-500',   desc: 'Premium placement, max visibility' },
  { value: 'Gold',    price: 3000, border: 'border-amber-400',  ring: 'ring-amber-400',  label: 'text-amber-500',  desc: 'High-profile booth, featured listing' },
  { value: 'Silver',  price: 1500, border: 'border-slate-400',  ring: 'ring-slate-400',  label: 'text-slate-400',  desc: 'Standard exhibitor listing' },
  { value: 'Bronze',  price: 800,  border: 'border-orange-500', ring: 'ring-orange-500', label: 'text-orange-600', desc: 'Entry-level presence' },
];

const EXHIBITOR_ADDONS = [
  { id: 'extra_pass',  label: 'Additional Exhibitor Pass',  desc: 'Extra staff badge (up to 5)',   price: 100, maxQty: 5 },
  { id: 'electricity', label: 'Electricity (16A)',           desc: 'Single-phase connection',       price: 200, maxQty: 1 },
  { id: 'furniture',   label: 'Furniture Package',           desc: 'Table, 2 chairs & display',    price: 300, maxQty: 1 },
  { id: 'premium_loc', label: 'Premium Location',            desc: 'Upgrade to high-traffic area', price: 500, maxQty: 1 },
];

const PAYNOW_METHODS = [
  { id: 'ecocash',  label: 'EcoCash',          hint: 'EcoCash mobile money',   icon: Smartphone },
  { id: 'onemoney', label: 'OneMoney',          hint: 'NetOne OneMoney',        icon: Smartphone },
  { id: 'card',     label: 'Visa / Mastercard', hint: 'Debit or credit card',   icon: CreditCard },
];

const ROLE_TYPES = [
  { value: 'Attendee',  icon: User,     color: 'bg-blue-500',   desc: 'Industry visitor & buyer' },
  { value: 'Exhibitor', icon: Building2,color: 'bg-amber-500',  desc: 'Company with a booth' },
  { value: 'Sponsor',   icon: Star,     color: 'bg-yellow-500', desc: 'Event sponsor partner' },
  { value: 'Speaker',   icon: Mic,      color: 'bg-purple-500', desc: 'Conference presenter' },
  { value: 'VIP Guest', icon: Crown,    color: 'bg-rose-500',   desc: 'Special invite or dignitary' },
];

const TICKET_MAP  = { Attendee: ['General Admission', 'VIP Pass'], Exhibitor: ['Exhibitor Pass'], Sponsor: ['VIP Pass', 'Exhibitor Pass'], Speaker: ['Speaker Pass'], 'VIP Guest': ['VIP Pass'] };
const BADGE_MAP   = { Attendee: 'Visitor', Exhibitor: 'Exhibitor', Sponsor: 'Sponsor', Speaker: 'Speaker', 'VIP Guest': 'VIP' };

function isValidZimPhone(v) {
  if (!v) return true;
  return /^(\+2637[0-9]{8}|07[0-9]{8})$/.test(v.replace(/[\s\-\(\)]/g, ''));
}

// ── Helpers ────────────────────────────────────────────────────────────────
function Field({ icon: Icon, label, placeholder, value, onChange, type = 'text', required, autoComplete, fromAccount }) {
  return (
    <div className="relative">
      {label && (
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          {fromAccount && <span className="text-[10px] bg-amber/10 text-amber border border-amber/20 px-1.5 py-0.5 rounded font-medium">From account</span>}
        </div>
      )}
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
      </div>
    </div>
  );
}

function QtyControl({ value, onChange, min = 1, max = 10 }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
        disabled={value <= min}>
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-lg font-bold w-6 text-center">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
        disabled={value >= max}>
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Register() {
  const { user, setSession } = useAuth();
  const queryClient = useQueryClient();

  // step: 'role' | 'details' | 'tier' | 'review' | 'payment' | 'done'
  const [step, setStep] = useState('role');
  const [socialError, setSocialError] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [created, setCreated] = useState(null);

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company: '',
    role_type: '', ticket_type: '', badge_category: '',
    notes: '', day1: true, day2: false, day3: false,
  });

  // Pre-fill from account
  const [fromAccount, setFromAccount] = useState({ full_name: false, email: false, company: false });
  useEffect(() => {
    if (user) {
      setForm(f => {
        const updated = { ...f };
        const flags = { full_name: false, email: false, company: false };
        if (!f.full_name && user.full_name) { updated.full_name = user.full_name; flags.full_name = true; }
        if (!f.email && user.email)         { updated.email = user.email;         flags.email = true; }
        if (!f.company && user.company)     { updated.company = user.company;     flags.company = true; }
        setFromAccount(flags);
        return updated;
      });
    }
  }, [user]);

  // Quantity (Attendee)
  const [quantity, setQuantity] = useState(1);

  // Exhibitor tier & addons
  const [exhibitorTier, setExhibitorTier] = useState('');
  const [addonQty, setAddonQty] = useState({});   // { extra_pass: 0, electricity: 0, ... }

  // Payment
  const [payMethod, setPayMethod] = useState('');
  const [payStatus, setPayStatus] = useState('idle'); // idle | processing | success | failed
  const [payRef, setPayRef] = useState('');

  const set = (k, v) => {
    if (k === 'email') setDuplicateError(false);
    setForm(f => ({ ...f, [k]: v }));
  };

  const selectRole = (role) => {
    const tickets = TICKET_MAP[role];
    setForm(f => ({ ...f, role_type: role, ticket_type: tickets[0], badge_category: BADGE_MAP[role] }));
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const tierPrice = EXHIBITOR_TIERS.find(t => t.value === exhibitorTier)?.price ?? 0;

  const addonTotal = EXHIBITOR_ADDONS.reduce((sum, a) => sum + (addonQty[a.id] || 0) * a.price, 0);

  const basePrice = form.role_type === 'Exhibitor'
    ? tierPrice
    : (TICKET_PRICES[form.ticket_type] || 0);

  const total = form.role_type === 'Exhibitor'
    ? tierPrice + addonTotal
    : basePrice * quantity;

  const isPaid = total > 0;

  const STEPS_EXHIBITOR = ['role', 'details', 'tier', 'review', 'payment', 'done'];
  const STEPS_PAID      = ['role', 'details', 'review', 'payment', 'done'];
  const STEPS_FREE      = ['role', 'details', 'review', 'done'];
  const steps = form.role_type === 'Exhibitor' ? STEPS_EXHIBITOR : (isPaid ? STEPS_PAID : STEPS_FREE);
  const stepIdx = steps.indexOf(step);
  const progressSteps = steps.filter(s => s !== 'role' && s !== 'done');
  const progressIdx = progressSteps.indexOf(step);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => Registration.create(data),
    onSuccess: (rec) => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      setCreated(rec);
      setStep('done');
    },
  });

  const handleSubmit = (ref) => {
    mutation.mutate({
      full_name:       form.full_name,
      email:           form.email,
      phone:           form.phone,
      company:         form.company,
      role_type:       form.role_type,
      ticket_type:     form.ticket_type,
      badge_category:  form.badge_category,
      notes:           form.notes,
      day1: form.day1, day2: form.day2, day3: form.day3,
      quantity:        form.role_type === 'Exhibitor' ? 1 : quantity,
      exhibitor_tier:  form.role_type === 'Exhibitor' ? exhibitorTier : undefined,
      addons:          form.role_type === 'Exhibitor' ? Object.entries(addonQty).filter(([,q]) => q > 0).map(([id,qty]) => ({ id, qty })) : undefined,
      total_amount:    total,
      payment_method:  ref ? payMethod : 'none',
      payment_ref:     ref || '',
      payment_status:  ref ? 'paid' : 'pending',
      status:          'pending',
    });
  };

  // ── PayNow stub ───────────────────────────────────────────────────────────
  const handlePayNow = () => {
    if (!payMethod) return;
    setPayStatus('processing');
    const ref = 'MC' + Date.now().toString().slice(-8).toUpperCase();
    setPayRef(ref);
    // Stub: simulate 2s processing then confirm
    setTimeout(() => {
      setPayStatus('success');
      setTimeout(() => handleSubmit(ref), 800);
    }, 2000);
  };

  // ── Steps ─────────────────────────────────────────────────────────────────
  const goNext = (nextStep) => { setStep(nextStep); window.scrollTo(0, 0); };
  const goBack = (prevStep) => { setStep(prevStep); window.scrollTo(0, 0); };

  return (
    <div className="pb-24 max-w-2xl lg:max-w-3xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Event Registration</h1>
      <p className="text-muted-foreground text-sm mb-4">Register for MineCon 2026 — get a badge & ticket to attend the exhibition.</p>

      {!user && step === 'role' && (
        <Link to="/signup"
          className="flex items-center gap-3 p-3 rounded-xl border border-amber/40 bg-amber/5 hover:bg-amber/10 transition-colors mb-5 group">
          <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Just need a platform account?</p>
            <p className="text-xs text-muted-foreground">Create a free account to book meetings & connect — no ticket required.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Progress bar */}
      {step !== 'role' && step !== 'done' && progressSteps.length > 0 && (
        <div className="flex items-center gap-1 mb-6">
          {progressSteps.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= progressIdx ? 'bg-amber' : 'bg-muted'}`} />
          ))}
        </div>
      )}

      {/* ── ROLE SELECTION ──────────────────────────────────────────────── */}
      {step === 'role' && (
        <div>
          <SocialAuthButtons
            onSuccess={(userData) => {
              setSession(userData);
              setForm(f => ({ ...f, full_name: userData.full_name || f.full_name, email: userData.email || f.email }));
              setFromAccount(p => ({ ...p, full_name: !!userData.full_name, email: !!userData.email }));
              setSocialError('');
            }}
            onError={setSocialError}
          />
          {socialError && <p className="mt-2 text-xs text-destructive">{socialError}</p>}
          <SocialDivider />

          <p className="text-sm font-semibold mb-4">Select your registration type:</p>
          <div className="space-y-3">
            {ROLE_TYPES.map(r => {
              const Icon = r.icon;
              return (
                <button key={r.value} onClick={() => { selectRole(r.value); goNext('details'); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-amber border-border bg-card">
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

      {/* ── PERSONAL DETAILS ────────────────────────────────────────────── */}
      {step === 'details' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold mb-2">
            Your details — <span className="text-amber">{form.role_type}</span>
            {user && <span className="text-xs text-muted-foreground font-normal ml-2">(pre-filled from your account)</span>}
          </p>

          <Field icon={User} label="Full name" placeholder="Full name *" value={form.full_name}
            onChange={v => set('full_name', v)} required fromAccount={fromAccount.full_name} />
          <Field icon={Mail} label="Email address" placeholder="Email address *" type="email" value={form.email}
            onChange={v => set('email', v)} required fromAccount={fromAccount.email} />
          <Field icon={Phone} label="Phone (optional)" placeholder="+263 77 123 4567" type="tel" autoComplete="off"
            value={form.phone} onChange={v => { set('phone', v); setPhoneError(v && !isValidZimPhone(v) ? 'Zimbabwe numbers only' : ''); }}
            fromAccount={false} />
          {phoneError && <p className="text-xs text-destructive -mt-2 pl-1">{phoneError}</p>}
          <Field icon={Building2} label="Company / Organisation" placeholder="Company (optional)" value={form.company}
            onChange={v => set('company', v)} fromAccount={fromAccount.company} />

          {/* Ticket type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ticket Type</p>
            <div className="flex gap-2 flex-wrap">
              {TICKET_MAP[form.role_type]?.map(t => (
                <button key={t} type="button" onClick={() => set('ticket_type', t)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.ticket_type === t ? 'bg-amber text-white border-amber' : 'border-border hover:border-amber/50'}`}>
                  {t}
                  {TICKET_PRICES[t] > 0 && <span className="ml-1.5 opacity-70">${TICKET_PRICES[t]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity — Attendee only */}
          {form.role_type === 'Attendee' && (
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Number of Tickets</p>
                <p className="text-xs text-muted-foreground">Max 10 per registration</p>
              </div>
              <div className="flex items-center justify-between">
                <QtyControl value={quantity} onChange={setQuantity} min={1} max={10} />
                {TICKET_PRICES[form.ticket_type] > 0 && (
                  <p className="text-sm font-bold text-amber">
                    Total: ${(TICKET_PRICES[form.ticket_type] * quantity).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attendance Days */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Attendance Days</p>
            <div className="flex gap-2">
              {[['day1', 'Day 1 · Oct 14'], ['day2', 'Day 2 · Oct 15'], ['day3', 'Day 3 · Oct 16']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => set(key, !form[key])}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${form[key] ? 'bg-steel text-white border-steel' : 'border-border hover:border-steel/50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <textarea placeholder="Special requirements or notes (optional)" value={form.notes}
            onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none" />

          {duplicateError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">This email is already registered.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => goBack('role')}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Back
            </button>
            <button type="button"
              onClick={async () => {
                if (phoneError) return;
                if (!form.full_name || !form.email) return;
                // Check for duplicate email
                try {
                  const existing = await Registration.findByEmail(form.email);
                  if (existing) { setDuplicateError(true); return; }
                } catch {}
                goNext(form.role_type === 'Exhibitor' ? 'tier' : 'review');
              }}
              disabled={!form.full_name || !form.email}
              className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
              {form.role_type === 'Exhibitor' ? 'Choose Tier →' : 'Review →'}
            </button>
          </div>
        </div>
      )}

      {/* ── EXHIBITOR TIER & ADDONS ──────────────────────────────────────── */}
      {step === 'tier' && (
        <div className="space-y-5">
          <p className="text-sm font-semibold">Choose your exhibitor tier</p>

          <div className="grid grid-cols-2 gap-3">
            {EXHIBITOR_TIERS.map(t => (
              <button key={t.value} type="button" onClick={() => setExhibitorTier(t.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  exhibitorTier === t.value
                    ? `${t.border} ${t.ring} ring-1 bg-muted/40`
                    : 'border-border hover:border-muted-foreground/50'
                }`}>
                <p className={`text-base font-bold ${t.label}`}>{t.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                <p className="text-sm font-bold mt-2">${t.price.toLocaleString()}</p>
              </button>
            ))}
          </div>

          {/* Addons */}
          <div>
            <p className="text-sm font-semibold mb-3">Optional add-ons</p>
            <div className="space-y-2">
              {EXHIBITOR_ADDONS.map(a => {
                const qty = addonQty[a.id] || 0;
                return (
                  <div key={a.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.desc} · <span className="font-medium">${a.price}</span>{a.maxQty > 1 ? ' each' : ''}</p>
                    </div>
                    {a.maxQty > 1 ? (
                      <QtyControl value={qty} onChange={v => setAddonQty(p => ({ ...p, [a.id]: v }))} min={0} max={a.maxQty} />
                    ) : (
                      <button type="button"
                        onClick={() => setAddonQty(p => ({ ...p, [a.id]: qty ? 0 : 1 }))}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${qty ? 'bg-amber border-amber text-white' : 'border-border hover:border-amber'}`}>
                        {qty ? <CheckCircle className="w-4 h-4" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Running total */}
          <div className="bg-steel text-white rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Total</p>
            <div className="space-y-1 text-sm">
              {exhibitorTier && (
                <div className="flex justify-between">
                  <span className="text-slate-300">{exhibitorTier} Tier</span>
                  <span className="font-semibold">${tierPrice.toLocaleString()}</span>
                </div>
              )}
              {EXHIBITOR_ADDONS.filter(a => (addonQty[a.id] || 0) > 0).map(a => (
                <div key={a.id} className="flex justify-between text-slate-300">
                  <span>{a.label}{addonQty[a.id] > 1 ? ` ×${addonQty[a.id]}` : ''}</span>
                  <span>${(a.price * (addonQty[a.id] || 0)).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-white/20 pt-1 mt-1 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-amber">${(tierPrice + addonTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => goBack('details')}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Back
            </button>
            <button type="button" onClick={() => goNext('review')} disabled={!exhibitorTier}
              className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
              Review →
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEW ──────────────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">Review your registration</p>
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {[
              ['Type', form.role_type],
              ['Name', form.full_name],
              ['Email', form.email],
              ['Phone', form.phone || '—'],
              ['Company', form.company || '—'],
              ['Ticket', form.ticket_type + (quantity > 1 ? ` ×${quantity}` : '')],
              ['Badge', form.badge_category],
              form.role_type === 'Exhibitor' && ['Tier', exhibitorTier],
              ['Days', [form.day1 && 'Day 1', form.day2 && 'Day 2', form.day3 && 'Day 3'].filter(Boolean).join(', ') || 'Day 1'],
              form.notes && ['Notes', form.notes],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Addon summary for exhibitor */}
          {form.role_type === 'Exhibitor' && EXHIBITOR_ADDONS.some(a => (addonQty[a.id] || 0) > 0) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Add-ons</p>
              {EXHIBITOR_ADDONS.filter(a => (addonQty[a.id] || 0) > 0).map(a => (
                <div key={a.id} className="flex justify-between text-sm py-1">
                  <span>{a.label}{addonQty[a.id] > 1 ? ` ×${addonQty[a.id]}` : ''}</span>
                  <span className="font-medium">${(a.price * (addonQty[a.id] || 0)).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Amount due */}
          {total > 0 && (
            <div className="flex items-center justify-between bg-amber/10 border border-amber/30 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold">Amount due</p>
              <p className="text-xl font-bold text-amber">${total.toLocaleString()} USD</p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => goBack(form.role_type === 'Exhibitor' ? 'tier' : 'details')}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
              Edit
            </button>
            <button type="button"
              onClick={() => isPaid ? goNext('payment') : handleSubmit('')}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              {mutation.isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Submitting…</span>
               : isPaid ? 'Proceed to Payment →' : 'Confirm Registration'}
            </button>
          </div>
        </div>
      )}

      {/* ── PAYNOW PAYMENT ──────────────────────────────────────────────── */}
      {step === 'payment' && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-0.5">Payment</p>
            <p className="text-xs text-muted-foreground">Processed securely via PayNow Zimbabwe</p>
          </div>

          {/* Amount card */}
          <div className="bg-steel text-white rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Amount Due</p>
              <p className="text-3xl font-bold text-amber mt-0.5">${total.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">USD · MineCon 2026 registration</p>
            </div>
            <div className="w-12 h-12 bg-amber/20 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber" />
            </div>
          </div>

          {payStatus === 'idle' && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Select payment method</p>
              <div className="space-y-2">
                {PAYNOW_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} type="button" onClick={() => setPayMethod(m.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        payMethod === m.id ? 'border-amber bg-amber/5' : 'border-border hover:border-amber/40'
                      }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${payMethod === m.id ? 'bg-amber text-white' : 'bg-muted'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.hint}</p>
                      </div>
                      {payMethod === m.id && <CheckCircle className="w-4 h-4 text-amber ml-auto" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => goBack('review')}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">
                  Back
                </button>
                <button type="button" onClick={handlePayNow} disabled={!payMethod}
                  className="flex-1 py-3 rounded-xl bg-amber text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40">
                  Pay ${total.toLocaleString()} →
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                PayNow integration is active. You will be prompted by your mobile money provider to complete payment.
              </p>
            </>
          )}

          {payStatus === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
              <p className="font-semibold">Processing payment…</p>
              <p className="text-xs text-muted-foreground">Ref: <span className="font-mono text-foreground">{payRef}</span></p>
              <p className="text-xs text-muted-foreground">Please wait — do not close this page.</p>
            </div>
          )}

          {payStatus === 'success' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">Payment confirmed!</p>
              <p className="text-xs text-muted-foreground">Reference: <span className="font-mono text-foreground">{payRef}</span></p>
              <p className="text-xs text-muted-foreground">Completing your registration…</p>
              {mutation.isPending && <Loader2 className="w-5 h-5 animate-spin text-amber" />}
            </div>
          )}
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold">You're Registered!</p>
            <p className="text-sm text-muted-foreground mt-2">Welcome to MineCon 2026, <strong>{created?.full_name}</strong>.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Badge: <span className="font-semibold text-amber">{created?.badge_category}</span>
              {created?.total_amount > 0 && (
                <> · Paid: <span className="font-semibold text-emerald-500">${created.total_amount.toLocaleString()}</span></>
              )}
            </p>
            {created?.payment_ref && (
              <p className="text-xs text-muted-foreground mt-1">Payment ref: <span className="font-mono">{created.payment_ref}</span></p>
            )}
            <p className="text-xs text-muted-foreground mt-3">A confirmation will be sent to {created?.email}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-left space-y-1.5">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Next Steps</p>
            {['Add MineCon to your calendar', 'Browse the exhibitor directory', 'Book meetings with exhibitors', 'Review the event schedule', 'Access your QR badge under QR Resources'].map(s => (
              <p key={s} className="text-xs text-muted-foreground">✓ {s}</p>
            ))}
          </div>
          <div className="flex gap-3">
            <Link to="/qr-resources" className="flex-1 py-3 rounded-xl border border-amber text-amber text-sm font-semibold text-center hover:bg-amber/5 transition-colors">
              View My Badge
            </Link>
            <button onClick={() => {
              setForm({ full_name: '', email: '', phone: '', company: '', role_type: '', ticket_type: '', badge_category: '', notes: '', day1: true, day2: false, day3: false });
              setQuantity(1); setExhibitorTier(''); setAddonQty({});
              setPayMethod(''); setPayStatus('idle'); setPayRef(''); setCreated(null);
              setStep('role');
            }}
              className="flex-1 py-3 rounded-xl bg-amber text-white font-semibold text-sm hover:opacity-90 transition-opacity">
              Register Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
