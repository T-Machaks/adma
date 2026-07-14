import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageCircle } from 'lucide-react';
import { BoothMessage } from '@/api/entities';

// Threaded attendee <-> exhibitor chat, scoped to one exhibitor and one
// attendee (thread_email). Used both on the attendee-facing virtual stand
// (viewerRole="attendee") and in the exhibitor portal inbox (viewerRole="exhibitor").
export default function BoothChat({ exhibitorId, threadEmail, viewerRole, viewerName, compact = false }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const { data: allMessages = [] } = useQuery({
    queryKey: ['booth-messages', exhibitorId],
    queryFn: () => BoothMessage.filterByExhibitor(exhibitorId),
    enabled: !!exhibitorId && !!threadEmail,
    refetchInterval: 5000,
  });

  const messages = allMessages
    .filter(m => m.thread_email?.toLowerCase() === threadEmail?.toLowerCase())
    .sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (data) => BoothMessage.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['booth-messages', exhibitorId] }),
  });

  const send = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate({
      exhibitor_id: exhibitorId,
      thread_email: threadEmail,
      sender_name: viewerName || (viewerRole === 'exhibitor' ? 'Exhibitor' : 'Attendee'),
      from_exhibitor: viewerRole === 'exhibitor',
      message: trimmed,
    });
    setText('');
  };

  return (
    <div className={`flex flex-col ${compact ? 'h-72' : 'h-96'} bg-muted/30 rounded-xl border border-border overflow-hidden`}>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-1.5 py-6">
            <MessageCircle className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from_exhibitor ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs ${
              m.from_exhibitor ? 'bg-card border border-border' : 'bg-amber text-white'
            }`}>
              <p className="leading-snug">{m.message}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-2 border-t border-border bg-card">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={viewerRole === 'exhibitor' ? 'Reply to attendee…' : 'Message this exhibitor…'}
          maxLength={500}
          className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber border border-border min-w-0"
        />
        <button
          type="submit"
          disabled={!text.trim() || sendMutation.isPending}
          className="flex-shrink-0 p-2 rounded-lg bg-amber text-white hover:bg-amber/90 disabled:opacity-40 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
