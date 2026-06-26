import { useState, useRef, useEffect, useCallback } from 'react';
import { HardHat, X, Send, Loader2, UserPlus, LogIn, CheckCircle, User, Mail, Phone, CreditCard, Smartphone, ChevronRight, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Registration } from '@/api/entities';

const BUBBLE_SIZE = 52;
const PANEL_W = 384; // sm:w-96
const PANEL_H = 520;
const EDGE_PAD = 12;
const STORAGE_KEY = 'minecon_chat_pos';

const PROMPTS_BY_ROLE = {
  exhibitor: ['My meeting requests', 'Book a meeting', 'Event announcements'],
  default:   ['Register for MineCon', 'Book a meeting', 'Diamond exhibitors', 'Event schedule'],
};

const BOOKING_KEYWORDS  = /\b(book|meeting|meet|schedule|appointment|enquir|request a meet|contact exhibitor)\b/i;
const REGISTER_KEYWORDS = /\b(register|sign[\s-]?up|attend|get a ticket|get ticket|ticket|join|how do i register|how to register|i want to (come|attend|register))\b/i;

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

function defaultPos() {
  return {
    x: window.innerWidth  - BUBBLE_SIZE - EDGE_PAD,
    y: window.innerHeight - BUBBLE_SIZE - 80,
  };
}

function loadPos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      // re-clamp in case viewport changed since last visit
      return {
        x: clamp(saved.x, EDGE_PAD, window.innerWidth  - BUBBLE_SIZE - EDGE_PAD),
        y: clamp(saved.y, EDGE_PAD, window.innerHeight - BUBBLE_SIZE - EDGE_PAD),
      };
    }
  } catch {}
  return defaultPos();
}

function renderMd(text) {
  if (!text) return null;
  return text.split('\n').map((line, li) => {
    // Strip leading "- " / "• " for bullet lines, render as block with dot
    const bullet = /^[-•*]\s+(.+)/.exec(line);
    const numbered = /^(\d+)\.\s+(.+)/.exec(line);
    const content = bullet ? bullet[1] : numbered ? numbered[2] : line;

    // Inline: **bold** and *italic* — split on markers
    const parts = [];
    let rest = content;
    const INLINE = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let last = 0, m;
    while ((m = INLINE.exec(rest)) !== null) {
      if (m.index > last) parts.push(rest.slice(last, m.index));
      if (m[2] !== undefined) parts.push(<strong key={m.index} className="font-semibold text-white">{m[2]}</strong>);
      else if (m[3] !== undefined) parts.push(<em key={m.index} className="italic">{m[3]}</em>);
      last = m.index + m[0].length;
    }
    if (last < rest.length) parts.push(rest.slice(last));

    if (!content.trim()) return <br key={li} />;
    if (bullet) return (
      <div key={li} className="flex gap-1.5 mt-0.5">
        <span className="text-amber mt-0.5 shrink-0">•</span>
        <span>{parts}</span>
      </div>
    );
    if (numbered) return (
      <div key={li} className="flex gap-1.5 mt-0.5">
        <span className="text-amber shrink-0 font-semibold">{numbered[1]}.</span>
        <span>{parts}</span>
      </div>
    );
    return <p key={li} className="mt-0.5 first:mt-0">{parts}</p>;
  });
}

function AuthGate() {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[85%] space-y-3">
        <p className="text-gray-100 leading-relaxed">
          To book meetings or send enquiries you need a free MineCon account — it only takes a moment to set up.
        </p>
        <div className="flex gap-2">
          <a href="/signup"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber text-slate-900 text-xs font-semibold hover:bg-amber/80 transition-colors">
            <UserPlus size={13} /> Create account
          </a>
          <a href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-gray-200 text-xs font-medium hover:bg-white/5 transition-colors">
            <LogIn size={13} /> Log in
          </a>
        </div>
      </div>
    </div>
  );
}

const ATTENDEE_TICKETS = [
  { id: 'General Admission',      label: 'General Admission',       price: 10 },
  { id: 'VIP (includes parking)', label: 'VIP (incl. parking)',      price: 25 },
];

const EXHIBITOR_TIERS = [
  { id: 'Diamond', label: 'Diamond', price: 5000, color: 'text-cyan-400' },
  { id: 'Gold',    label: 'Gold',    price: 3000, color: 'text-amber-400' },
  { id: 'Silver',  label: 'Silver',  price: 1500, color: 'text-slate-400' },
  { id: 'Bronze',  label: 'Bronze',  price: 800,  color: 'text-orange-500' },
];

const EXHIBITOR_ADDONS = [
  { id: 'extra_pass',  label: 'Extra Staff Pass',      price: 100 },
  { id: 'electricity', label: 'Electricity (16A)',      price: 200 },
  { id: 'furniture',   label: 'Furniture Package',      price: 300 },
  { id: 'premium_loc', label: 'Premium Location',       price: 500 },
];

const PAY_METHODS = [
  { id: 'ecocash',  label: 'EcoCash',        Icon: Smartphone },
  { id: 'onemoney', label: 'OneMoney',        Icon: Smartphone },
  { id: 'card',     label: 'Visa/Mastercard', Icon: CreditCard },
];

function RegistrationForm({ prefillName, prefillEmail, onDone }) {
  // step: 'role' | 'details' | 'tier' | 'payment' | 'processing' | 'done'
  const [step,      setStep]    = useState('role');
  const [role,      setRole]    = useState('');        // 'Attendee' | 'Exhibitor'
  const [name,      setName]    = useState(prefillName  || '');
  const [email,     setEmail]   = useState(prefillEmail || '');
  const [phone,     setPhone]   = useState('');
  const [company,   setCompany] = useState('');
  // Attendee
  const [ticket,    setTicket]  = useState('General Admission');
  // Exhibitor
  const [tier,      setTier]    = useState('');
  const [addons,    setAddons]  = useState({}); // { id: qty }
  // Payment
  const [payMethod, setPayMethod] = useState('');
  const [err,       setErr]     = useState('');

  const tierPrice  = EXHIBITOR_TIERS.find(t => t.id === tier)?.price ?? 0;
  const addonTotal = EXHIBITOR_ADDONS.reduce((s, a) => s + (addons[a.id] || 0) * a.price, 0);
  const price = role === 'Exhibitor'
    ? tierPrice + addonTotal
    : (ATTENDEE_TICKETS.find(t => t.id === ticket)?.price ?? 10);

  function submitDetails(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setErr('Name and email are required.'); return; }
    if (role === 'Exhibitor' && !company.trim()) { setErr('Company name is required for exhibitors.'); return; }
    setErr('');
    setStep(role === 'Exhibitor' ? 'tier' : 'payment');
  }

  function submitTier() {
    if (!tier) { setErr('Please select an exhibitor tier.'); return; }
    setErr('');
    setStep('payment');
  }

  async function submitPayment() {
    if (!payMethod) { setErr('Please select a payment method.'); return; }
    setErr('');
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000));
    const ref = 'MC' + Date.now().toString().slice(-8).toUpperCase();
    try {
      const addonList = EXHIBITOR_ADDONS.filter(a => addons[a.id] > 0).map(a => ({ id: a.id, qty: addons[a.id] }));
      const reg = await Registration.create({
        full_name:       name.trim(),
        email:           email.trim().toLowerCase(),
        phone:           phone.trim() || null,
        company:         company.trim() || null,
        role_type:       role,
        ticket_type:     role === 'Exhibitor' ? 'Exhibitor Pass' : ticket,
        badge_category:  role === 'Exhibitor' ? 'Exhibitor' : 'Visitor',
        exhibitor_tier:  role === 'Exhibitor' ? tier : undefined,
        addons:          role === 'Exhibitor' && addonList.length ? addonList : undefined,
        total_amount:    price,
        payment_method:  payMethod,
        payment_ref:     ref,
        payment_status:  'paid',
        status:          'Confirmed',
        day1: true, day2: true, day3: true,
        created_date:    new Date().toISOString(),
      });
      await Registration.sendConfirmation(reg.id).catch(() => {});
      setStep('done');
      onDone?.();
    } catch (e) {
      setErr(e.message || 'Registration failed. Please try again.');
      setStep('payment');
    }
  }

  const ic = "w-full pl-7 pr-3 py-1.5 rounded bg-gray-600 border border-gray-500 text-white text-xs placeholder-gray-400 focus:outline-none focus:border-amber/60";
  const optBtn = (active) => `w-full flex items-center justify-between px-3 py-2 rounded border text-xs transition-colors ${active ? 'border-amber bg-amber/10 text-white' : 'border-gray-500 text-gray-300 hover:border-amber/50'}`;

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg px-4 py-3 bg-gray-700 border border-green-500/40 text-sm max-w-[90%] space-y-2">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <CheckCircle size={15} /> {role === 'Exhibitor' ? 'Exhibitor booking confirmed!' : 'Payment received — you\'re in!'}
          </div>
          <p className="text-gray-200 text-xs leading-relaxed">
            {role === 'Exhibitor'
              ? <>Booked as <strong>{tier} Exhibitor</strong> for MineCon 2026. Confirmation sent to <strong>{email}</strong>. Our team will follow up with booth details.</>
              : <>Registered for <strong>MineCon 2026</strong> · {ticket}. Confirmation sent to <strong>{email}</strong>.</>}
          </p>
          {role !== 'Exhibitor' && (
            <a href="/qr-resources" className="inline-flex items-center gap-1.5 mt-1 text-xs text-amber underline underline-offset-2 hover:text-amber/80">
              View my entry QR badge →
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[90%] space-y-2">
          <div className="flex items-center gap-2 text-amber">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs font-semibold">Processing via {PAY_METHODS.find(m => m.id === payMethod)?.label}…</span>
          </div>
          <p className="text-gray-400 text-xs">Please wait — do not close this window.</p>
        </div>
      </div>
    );
  }

  // ── Payment ───────────────────────────────────────────────────────────────────
  if (step === 'payment') {
    const back = role === 'Exhibitor' ? 'tier' : 'details';
    return (
      <div className="flex justify-start">
        <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[95%] w-full space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-amber font-semibold text-xs uppercase tracking-wide">
              {role === 'Exhibitor' ? 'Confirm & Pay' : 'Select Ticket & Pay'}
            </p>
            <button onClick={() => setStep(back)} className="text-gray-400 hover:text-white text-[10px]">← Back</button>
          </div>

          {role === 'Attendee' && (
            <div className="space-y-1.5">
              {ATTENDEE_TICKETS.map(t => (
                <button key={t.id} type="button" onClick={() => setTicket(t.id)} className={optBtn(ticket === t.id)}>
                  <span>{t.label}</span>
                  <span className="font-bold text-amber">${t.price}</span>
                </button>
              ))}
            </div>
          )}

          {role === 'Exhibitor' && (
            <div className="bg-gray-600 rounded px-3 py-2 text-xs space-y-0.5">
              <p className="text-gray-300">{tier} tier — <span className="text-amber font-bold">${tierPrice.toLocaleString()}</span></p>
              {EXHIBITOR_ADDONS.filter(a => addons[a.id] > 0).map(a => (
                <p key={a.id} className="text-gray-400">+ {a.label} × {addons[a.id]} — ${(a.price * addons[a.id]).toLocaleString()}</p>
              ))}
              <p className="text-white font-bold pt-1 border-t border-gray-500 mt-1">Total: ${price.toLocaleString()}</p>
            </div>
          )}

          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5">Payment method</p>
            <div className="space-y-1">
              {PAY_METHODS.map(({ id, label, Icon }) => (
                <button key={id} type="button" onClick={() => setPayMethod(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded border text-xs transition-colors ${payMethod === id ? 'border-amber bg-amber/10 text-white' : 'border-gray-500 text-gray-300 hover:border-amber/50'}`}>
                  <Icon size={13} className="text-gray-400 shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button type="button" onClick={submitPayment} disabled={!payMethod}
            className="w-full py-1.5 rounded bg-amber text-slate-900 text-xs font-bold hover:bg-amber/80 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
            Pay ${price.toLocaleString()} <ChevronRight size={13} />
          </button>
          <p className="text-gray-500 text-[10px] text-center">Secured via PayNow · Artfarm Grounds, Harare</p>
        </div>
      </div>
    );
  }

  // ── Exhibitor Tier ─────────────────────────────────────────────────────────
  if (step === 'tier') {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[95%] w-full space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-amber font-semibold text-xs uppercase tracking-wide">Exhibitor Tier</p>
            <button onClick={() => setStep('details')} className="text-gray-400 hover:text-white text-[10px]">← Back</button>
          </div>

          <div className="space-y-1.5">
            {EXHIBITOR_TIERS.map(t => (
              <button key={t.id} type="button" onClick={() => setTier(t.id)} className={optBtn(tier === t.id)}>
                <span className={`font-bold ${t.color}`}>{t.label}</span>
                <span className="font-bold text-amber">${t.price.toLocaleString()}</span>
              </button>
            ))}
          </div>

          {/* Addons */}
          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-1.5">Optional Add-ons</p>
            <div className="space-y-1">
              {EXHIBITOR_ADDONS.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-1.5 rounded border border-gray-600 text-xs text-gray-300">
                  <span>{a.label} <span className="text-gray-500">(${a.price})</span></span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setAddons(prev => ({ ...prev, [a.id]: Math.max(0, (prev[a.id] || 0) - 1) }))}
                      className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center hover:bg-gray-500 text-white">−</button>
                    <span className="w-4 text-center font-bold">{addons[a.id] || 0}</span>
                    <button type="button" onClick={() => setAddons(prev => ({ ...prev, [a.id]: (prev[a.id] || 0) + 1 }))}
                      className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center hover:bg-gray-500 text-white">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button type="button" onClick={submitTier}
            className="w-full py-1.5 rounded bg-amber text-slate-900 text-xs font-bold hover:bg-amber/80 flex items-center justify-center gap-1 transition-colors">
            Next — Payment <ChevronRight size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Details ─────────────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <div className="flex justify-start">
        <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[95%] w-full space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-amber font-semibold text-xs uppercase tracking-wide">
              {role === 'Exhibitor' ? 'Exhibitor Details' : 'Your Details'}
            </p>
            <button onClick={() => setStep('role')} className="text-gray-400 hover:text-white text-[10px]">← Back</button>
          </div>
          <form onSubmit={submitDetails} className="space-y-2">
            <div className="relative">
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)} className={ic} />
            </div>
            <div className="relative">
              <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} className={ic} />
            </div>
            <div className="relative">
              <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} className={ic} />
            </div>
            {role === 'Exhibitor' && (
              <input required placeholder="Company name *" value={company} onChange={e => setCompany(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-gray-600 border border-gray-500 text-white text-xs placeholder-gray-400 focus:outline-none focus:border-amber/60" />
            )}
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <button type="submit"
              className="w-full py-1.5 rounded bg-amber text-slate-900 text-xs font-bold hover:bg-amber/80 flex items-center justify-center gap-1 transition-colors">
              Next <ChevronRight size={13} />
            </button>
          </form>
          <p className="text-gray-400 text-[10px]">Artfarm Grounds, Pomona, Harare</p>
        </div>
      </div>
    );
  }

  // ── Role picker ──────────────────────────────────────────────────────────────
  return (
    <div className="flex justify-start">
      <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[95%] w-full space-y-3">
        <p className="text-amber font-semibold text-xs uppercase tracking-wide">Register for MineCon 2026</p>
        <p className="text-gray-300 text-xs">Are you attending as a visitor or do you have a company exhibiting?</p>
        <div className="space-y-1.5">
          <button type="button" onClick={() => { setRole('Attendee'); setStep('details'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-gray-500 text-xs text-gray-300 hover:border-amber/60 hover:bg-amber/5 transition-colors text-left">
            <User size={15} className="text-amber shrink-0" />
            <div>
              <p className="font-semibold text-white">Attendee / Visitor</p>
              <p className="text-gray-400 text-[10px]">General Admission $10 · VIP $25</p>
            </div>
          </button>
          <button type="button" onClick={() => { setRole('Exhibitor'); setStep('details'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-gray-500 text-xs text-gray-300 hover:border-amber/60 hover:bg-amber/5 transition-colors text-left">
            <Building2 size={15} className="text-amber shrink-0" />
            <div>
              <p className="font-semibold text-white">Exhibitor / Company</p>
              <p className="text-gray-400 text-[10px]">Bronze $800 · Silver $1,500 · Gold $3,000 · Diamond $5,000</p>
            </div>
          </button>
        </div>
        <p className="text-gray-500 text-[10px]">Artfarm Grounds, Pomona, Harare · 2026</p>
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [pos, setPos]         = useState(loadPos);
  const [dragging, setDragging] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const sessionId  = useRef(crypto.randomUUID());
  const dragState  = useRef(null); // { startX, startY, origX, origY, moved }

  const suggestedPrompts = PROMPTS_BY_ROLE[user?.role] ?? PROMPTS_BY_ROLE.default;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // ── Drag logic ──────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, moved: false };
    setDragging(false);

    function onMove(ev) {
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      if (!dragState.current.moved && Math.hypot(dx, dy) < 6) return;
      dragState.current.moved = true;
      setDragging(true);
      const nx = clamp(dragState.current.origX + dx, EDGE_PAD, window.innerWidth  - BUBBLE_SIZE - EDGE_PAD);
      const ny = clamp(dragState.current.origY + dy, EDGE_PAD, window.innerHeight - BUBBLE_SIZE - EDGE_PAD);
      setPos({ x: nx, y: ny });
    }

    function onUp(ev) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      if (dragState.current.moved) {
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        const nx = clamp(dragState.current.origX + dx, EDGE_PAD, window.innerWidth  - BUBBLE_SIZE - EDGE_PAD);
        const ny = clamp(dragState.current.origY + dy, EDGE_PAD, window.innerHeight - BUBBLE_SIZE - EDGE_PAD);
        const finalPos = { x: nx, y: ny };
        setPos(finalPos);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
      }
      setTimeout(() => setDragging(false), 0);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [pos]);

  function handleBubbleClick() {
    if (!dragState.current?.moved) setOpen(o => !o);
  }

  // ── Chat panel position: anchor above/beside bubble ──────────────────────
  const panelW = Math.min(PANEL_W, window.innerWidth - 2 * EDGE_PAD);
  const panelLeft = clamp(pos.x + BUBBLE_SIZE / 2 - panelW / 2, EDGE_PAD, window.innerWidth - panelW - EDGE_PAD);
  const spaceBelow = window.innerHeight - pos.y - BUBBLE_SIZE;
  const panelTop = spaceBelow >= PANEL_H + 8
    ? pos.y + BUBBLE_SIZE + 8
    : Math.max(EDGE_PAD, pos.y - PANEL_H - 8);

  // ── Message send ────────────────────────────────────────────────────────────
  function pushAuthGate(userText) {
    setMessages(prev => [...prev, { role: 'user', content: userText }, { role: 'gate' }]);
    setInput('');
  }

  function pushRegForm(userText) {
    setMessages(prev => [
      ...prev,
      ...(userText ? [{ role: 'user', content: userText }] : []),
      { role: 'assistant', content: 'Great! Fill in your details below and I\'ll register you right now — it\'s free.' },
      { role: 'regform', prefillName: user?.full_name, prefillEmail: user?.email },
    ]);
    setInput('');
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (REGISTER_KEYWORDS.test(text)) { pushRegForm(text); return; }
    if (!user && BOOKING_KEYWORDS.test(text)) { pushAuthGate(text); return; }
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId.current, userName: user?.full_name, userEmail: user?.email, userRole: user?.role, userCompany: user?.company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handlePromptClick(p) {
    if (REGISTER_KEYWORDS.test(p)) { pushRegForm(null); return; }
    if (!user && BOOKING_KEYWORDS.test(p)) { setMessages([{ role: 'gate' }]); return; }
    setInput(p);
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col rounded-xl shadow-2xl border border-white/10 bg-[#1a2332] overflow-hidden"
          style={{ left: panelLeft, top: panelTop, width: panelW, maxHeight: Math.min(PANEL_H, window.innerHeight - 2 * EDGE_PAD) }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-amber/10 border-b border-white/10">
            <HardHat size={18} className="text-amber" />
            <span className="text-sm font-semibold text-white">The Foreman</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: '400px' }}>
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <HardHat size={32} className="mx-auto mb-2 text-amber/50" />
                <p className="font-medium text-slate-300">Hi! I'm The Foreman.</p>
                <p className="mt-1 text-xs">Ask me about exhibitors, the schedule, venue, or anything about the event.</p>
                {!user && (
                  <p className="mt-3 text-xs text-amber/70">
                    <a href="/signup" className="underline underline-offset-2 hover:text-amber transition-colors">Create a free account</a>
                    {' '}to book meetings instantly.
                  </p>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              m.role === 'gate'    ? <AuthGate key={i} />
              : m.role === 'regform' ? (
                <RegistrationForm
                  key={i}
                  prefillName={m.prefillName}
                  prefillEmail={m.prefillEmail}
                  onDone={() => {
                    setMessages(prev => prev.map((msg, idx) =>
                      idx === i ? { ...msg, submitted: true } : msg
                    ));
                  }}
                />
              ) : (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] leading-relaxed ${
                    m.role === 'user' ? 'bg-amber text-slate-900 font-medium whitespace-pre-wrap' : 'bg-gray-700 text-gray-100 border border-gray-600'
                  }`}>
                    {m.role === 'user' ? m.content : renderMd(m.content)}
                  </div>
                </div>
              )
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-gray-700 border border-gray-600 flex items-center gap-2 text-gray-300">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          {messages.length === 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1">
              {suggestedPrompts.map(p => (
                <button key={p} onClick={() => handlePromptClick(p)}
                  className="text-xs px-2 py-1 rounded-full border border-amber/30 text-amber/80 hover:bg-amber/10 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <textarea
              ref={inputRef}
              rows={3}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about MineCon…"
              className="flex-1 resize-none bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber/50 leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber hover:bg-amber/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              <Send size={15} className="text-slate-900" />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble — draggable */}
      <button
        onPointerDown={onPointerDown}
        onClick={handleBubbleClick}
        className={`fixed z-50 rounded-full bg-amber shadow-lg flex items-center justify-center transition-transform select-none touch-none ${dragging ? 'scale-110 cursor-grabbing' : 'hover:scale-105 active:scale-95 cursor-grab'}`}
        style={{ left: pos.x, top: pos.y, width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
        aria-label="Open The Foreman"
      >
        {open ? <X size={22} className="text-slate-900" /> : <HardHat size={22} className="text-slate-900" />}
      </button>
    </>
  );
}
