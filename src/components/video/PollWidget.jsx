import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';

function voteKey(sessionId) { return `session_poll_vote_${sessionId}`; }

export default function PollWidget({ sessionId, session, onVote }) {
  const question = session?.poll_question;
  const rawOptions = session?.poll_options;
  const rawVotes = session?.poll_votes;

  const options = (() => {
    if (!rawOptions) return [];
    if (Array.isArray(rawOptions)) return rawOptions;
    try { return JSON.parse(rawOptions); } catch { return []; }
  })();

  const votes = (() => {
    if (!rawVotes) return {};
    if (typeof rawVotes === 'object') return rawVotes;
    try { return JSON.parse(rawVotes); } catch { return {}; }
  })();

  const [myVote, setMyVote] = useState(() => {
    try { return localStorage.getItem(voteKey(sessionId)); } catch { return null; }
  });

  const totalVotes = Object.values(votes).reduce((s, v) => s + (v || 0), 0);

  const castVote = (option) => {
    if (myVote) return;
    setMyVote(option);
    try { localStorage.setItem(voteKey(sessionId), option); } catch {}
    onVote?.(option);
  };

  if (!session?.poll_active || !question || options.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center py-8 text-muted-foreground text-sm">
        <div>
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No active poll right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm font-semibold text-foreground leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((opt) => {
          const count = votes[opt] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = myVote === opt;
          return (
            <button
              key={opt}
              onClick={() => castVote(opt)}
              disabled={!!myVote}
              className={`w-full text-left relative overflow-hidden rounded-lg border px-3 py-2.5 transition-all ${isSelected ? 'border-amber' : 'border-border hover:border-amber/40 disabled:cursor-default'}`}
            >
              {myVote && (
                <div
                  className={`absolute inset-y-0 left-0 ${isSelected ? 'bg-amber/20' : 'bg-muted'} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{opt}</span>
                {myVote && (
                  <span className="text-xs font-bold text-muted-foreground flex-shrink-0">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {myVote && (
        <p className="text-xs text-muted-foreground text-center">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</p>
      )}
      {!myVote && (
        <p className="text-xs text-muted-foreground text-center">Tap an option to vote</p>
      )}
    </div>
  );
}
