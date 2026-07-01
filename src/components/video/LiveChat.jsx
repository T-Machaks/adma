import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function storageKey(sessionId) {
  return `session_chat_${sessionId}`;
}

function loadMessages(sessionId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(sessionId)) || '[]');
  } catch {
    return [];
  }
}

function saveMessages(sessionId, msgs) {
  try {
    localStorage.setItem(storageKey(sessionId), JSON.stringify(msgs.slice(-200)));
  } catch {}
}

export default function LiveChat({ sessionId, enabled = true }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => loadMessages(sessionId));
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const msg = {
      id: Date.now(),
      author: user?.full_name || user?.email || 'Attendee',
      text: trimmed,
      ts: new Date().toISOString(),
    };
    const next = [...messages, msg];
    setMessages(next);
    saveMessages(sessionId, next);
    setText('');
  };

  if (!enabled) {
    return (
      <div className="flex-1 flex items-center justify-center text-center py-8 text-muted-foreground text-sm">
        Chat is disabled for this session.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hello!</p>
        )}
        {messages.map(m => (
          <div key={m.id} className="group">
            <span className="text-xs font-semibold text-amber">{m.author} </span>
            <span className="text-xs text-foreground">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-2 border-t border-border">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Say something…"
          maxLength={200}
          className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber border border-border min-w-0"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="flex-shrink-0 p-2 rounded-lg bg-amber text-white hover:bg-amber/90 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
