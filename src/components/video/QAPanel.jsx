import { useState, useEffect } from 'react';
import { ThumbsUp, Pin, X, Send } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function storageKey(sessionId) { return `session_qa_${sessionId}`; }

function load(sessionId) {
  try { return JSON.parse(localStorage.getItem(storageKey(sessionId)) || '[]'); }
  catch { return []; }
}

function save(sessionId, items) {
  try { localStorage.setItem(storageKey(sessionId), JSON.stringify(items)); }
  catch {}
}

export default function QAPanel({ sessionId, enabled = true, isOrganizer = false }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState(() => load(sessionId));
  const [text, setText] = useState('');

  const update = (next) => {
    setQuestions(next);
    save(sessionId, next);
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    update([...questions, {
      id: Date.now(),
      author: user?.full_name || 'Attendee',
      question: trimmed,
      votes: 0,
      featured: false,
      answered: false,
      ts: new Date().toISOString(),
    }]);
    setText('');
  };

  const upvote = (id) => {
    update(questions.map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q));
  };

  const toggleFeatured = (id) => {
    update(questions.map(q => q.id === id ? { ...q, featured: !q.featured } : q));
  };

  const toggleAnswered = (id) => {
    update(questions.map(q => q.id === id ? { ...q, answered: !q.answered } : q));
  };

  const dismiss = (id) => {
    update(questions.filter(q => q.id !== id));
  };

  if (!enabled) {
    return (
      <div className="flex-1 flex items-center justify-center text-center py-8 text-muted-foreground text-sm">
        Q&A is disabled for this session.
      </div>
    );
  }

  const sorted = [...questions].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.votes - a.votes;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {sorted.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No questions yet. Ask the first one!</p>
        )}
        {sorted.map(q => (
          <div
            key={q.id}
            className={`rounded-lg border p-2.5 text-xs ${q.featured ? 'border-amber bg-amber/5' : 'border-border bg-card'} ${q.answered ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {q.featured && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber uppercase mb-1">
                    <Pin className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
                <p className="text-foreground leading-snug">{q.question}</p>
                <p className="text-muted-foreground mt-0.5">{q.author}</p>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => upvote(q.id)}
                  className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-amber transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">{q.votes}</span>
                </button>
              </div>
            </div>
            {isOrganizer && (
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-border">
                <button
                  onClick={() => toggleFeatured(q.id)}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${q.featured ? 'bg-amber text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {q.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => toggleAnswered(q.id)}
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${q.answered ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {q.answered ? 'Answered' : 'Mark answered'}
                </button>
                <button onClick={() => dismiss(q.id)} className="ml-auto text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 p-2 border-t border-border">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Ask a question…"
          maxLength={300}
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
