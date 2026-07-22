import { useState, useRef, useEffect, useCallback } from 'react';
import { Sprout, X, Send, Loader2, UserPlus, LogIn, ExternalLink, Ticket, QrCode, WifiOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const BUBBLE_SIZE = 52;
const PANEL_W = 384; // sm:w-96
const PANEL_H = 520;
const EDGE_PAD = 12;
const STORAGE_KEY = EVENT_CONFIG.storageChatKey;

const PROMPTS_BY_ROLE = EVENT_CONFIG.chat.suggestedPrompts;

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
          To book meetings or send enquiries you need a free {EVENT_CONFIG.eventName} account — it only takes a moment to set up.
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

// Item 3: physical event ticketing is handled on the official show site, not in-chat —
// this replaces what used to be a full ticket-purchase-and-payment wizard.
function RegisterInfoCard() {
  const { settings } = useAppSettings();
  const redirectUrl = settings.physicalEventRegistrationUrl || 'https://agrishow.co.zw/';

  return (
    <div className="flex justify-start">
      <div className="rounded-lg px-4 py-3 bg-gray-700 border border-amber/30 text-sm max-w-[95%] w-full space-y-3">
        <div className="flex items-start gap-2">
          <Ticket size={15} className="text-amber shrink-0 mt-0.5" />
          <div>
            <p className="text-amber font-semibold text-xs uppercase tracking-wide">Physical Show Tickets</p>
            <p className="text-gray-300 text-xs mt-1">Entry passes and tickets for the physical {EVENT_CONFIG.eventName} are handled on the official show site.</p>
          </div>
        </div>
        <a
          href={redirectUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-amber text-slate-900 text-xs font-bold hover:bg-amber/80 transition-colors"
        >
          Register for the Physical Show <ExternalLink size={13} />
        </a>
        <div className="border-t border-gray-600 pt-2.5 flex items-start gap-2">
          <QrCode size={15} className="text-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-300 text-xs">Just need a free digital platform account for the QR badge, meetings and exhibitors?</p>
            <a href="/signup" className="inline-flex items-center gap-1 mt-1.5 text-xs text-amber underline underline-offset-2 hover:text-amber/80">
              <UserPlus size={12} /> Create a free account
            </a>
          </div>
        </div>
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
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

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
      { role: 'regform' },
    ]);
    setInput('');
  }

  function pushOfflineMsg(userText) {
    setMessages(prev => [
      ...prev,
      ...(userText ? [{ role: 'user', content: userText }] : []),
      { role: 'offline-block' },
    ]);
    setInput('');
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (REGISTER_KEYWORDS.test(text)) {
      pushRegForm(text); return;
    }
    if (BOOKING_KEYWORDS.test(text)) {
      if (!isOnline) { pushOfflineMsg(text); return; }
      if (!user) { pushAuthGate(text); return; }
    }
    if (!isOnline) {
      setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'offline-block' }]);
      setInput('');
      return;
    }
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
    if (REGISTER_KEYWORDS.test(p)) {
      pushRegForm(null); return;
    }
    if (!user && BOOKING_KEYWORDS.test(p)) {
      if (!isOnline) { pushOfflineMsg(null); return; }
      setMessages([{ role: 'gate' }]); return;
    }
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
          className="fixed z-50 flex flex-col rounded-xl shadow-2xl border border-white/10 bg-[#12241a] overflow-hidden"
          style={{ left: panelLeft, top: panelTop, width: panelW, maxHeight: Math.min(PANEL_H, window.innerHeight - 2 * EDGE_PAD) }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-amber/10 border-b border-white/10">
            <Sprout size={18} className="text-amber" />
            <span className="text-sm font-semibold text-white">{EVENT_CONFIG.chat.agentName}</span>
            {!isOnline && (
              <span className="ml-1 flex items-center gap-1 text-[10px] text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-full">
                <WifiOff size={9} /> offline
              </span>
            )}
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: '400px' }}>
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <Sprout size={32} className="mx-auto mb-2 text-amber/50" />
                <p className="font-medium text-slate-300">{EVENT_CONFIG.chat.agentName}, at your service.</p>
                <p className="mt-1 text-xs">Exhibitors, schedule, venue — I know things. Possibly too many things. Ask away, I won't judge. Much.</p>
                {!user && (
                  <p className="mt-3 text-xs text-amber/70">
                    <a href="/signup" className="underline underline-offset-2 hover:text-amber transition-colors">Create a free account</a>
                    {' '}to book meetings instantly.
                  </p>
                )}
              </div>
            )}

            {messages.map((m, i) => (
              m.role === 'offline-block' ? (
                <div key={i} className="flex justify-start">
                  <div className="rounded-lg px-4 py-3 bg-gray-700 border border-slate-600 text-sm max-w-[85%] flex items-start gap-2.5">
                    <WifiOff size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-xs leading-relaxed">
                      You're offline. Registration and meeting bookings need an internet connection — reconnect and try again.
                    </p>
                  </div>
                </div>
              )
              : m.role === 'gate'    ? <AuthGate key={i} />
              : m.role === 'regform' ? <RegisterInfoCard key={i} /> : (
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
              placeholder={EVENT_CONFIG.chat.placeholder}
              className="flex-1 resize-none bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber/50 leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber hover:bg-amber/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              title={!isOnline ? 'Offline — general questions only' : undefined}>
              {!isOnline ? <WifiOff size={15} className="text-slate-900" /> : <Send size={15} className="text-slate-900" />}
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
        aria-label={`Open ${EVENT_CONFIG.chat.agentName}`}
      >
        {open ? <X size={22} className="text-slate-900" /> : <Sprout size={22} className="text-slate-900" />}
      </button>
    </>
  );
}
