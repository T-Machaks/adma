import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const BUBBLE_SIZE = 52;
const PANEL_W = 384; // sm:w-96
const PANEL_H = 520;
const EDGE_PAD = 12;
const STORAGE_KEY = 'minecon_chat_pos';

const PROMPTS_BY_ROLE = {
  exhibitor: ['My meeting requests', 'Book a meeting', 'Event announcements'],
  default:   ['Book a meeting', 'Diamond exhibitors', 'Event schedule', 'Venue & directions'],
};

const BOOKING_KEYWORDS = /\b(book|meeting|meet|schedule|appointment|enquir|request a meet|contact exhibitor)\b/i;

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

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
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
            <Bot size={18} className="text-amber" />
            <span className="text-sm font-semibold text-white">MineCon Assistant</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ maxHeight: '400px' }}>
            {messages.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <Bot size={32} className="mx-auto mb-2 text-amber/50" />
                <p className="font-medium text-slate-300">Hi! I'm your MineCon assistant.</p>
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
              m.role === 'gate'
                ? <AuthGate key={i} />
                : (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user' ? 'bg-amber text-slate-900 font-medium' : 'bg-gray-700 text-gray-100 border border-gray-600'
                    }`}>
                      {m.content}
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
        aria-label="Open MineCon Assistant"
      >
        {open ? <X size={22} className="text-slate-900" /> : <MessageCircle size={22} className="text-slate-900" />}
      </button>
    </>
  );
}
