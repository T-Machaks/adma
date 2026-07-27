import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exhibitor, BoothMessage } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { MessageCircle, Inbox } from 'lucide-react';
import BoothChat from '@/components/exhibitor/BoothChat';

export default function ExhibitorMessages() {
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState(null);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  const { data: messages = [] } = useQuery({
    queryKey: ['booth-messages', myBooth?.id],
    queryFn: () => BoothMessage.filterByExhibitor(myBooth.id),
    enabled: !!myBooth,
    refetchInterval: 5000,
  });

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">No booth linked to your account.</p>
      </div>
    );
  }

  // Group by thread_email, newest message per thread first
  const threadMap = new Map();
  for (const m of messages) {
    const key = m.thread_email;
    if (!key) continue;
    const existing = threadMap.get(key);
    if (!existing || (m.created_date || '') > (existing.created_date || '')) {
      threadMap.set(key, m);
    }
  }
  const threads = [...threadMap.entries()]
    .map(([email, lastMsg]) => ({ email, lastMsg }))
    .sort((a, b) => (b.lastMsg.created_date || '').localeCompare(a.lastMsg.created_date || ''));

  const activeThread = selectedThread || threads[0]?.email || null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber" /> Attendee Messages
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Live chat threads from attendees browsing your virtual stand</p>
      </div>

      {threads.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">Conversations started from your virtual stand will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1 space-y-2">
            {threads.map(({ email, lastMsg }) => (
              <button
                key={email}
                onClick={() => setSelectedThread(email)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${
                  activeThread === email ? 'border-amber bg-amber/5' : 'border-border bg-card hover:bg-muted'
                }`}
              >
                <p className="text-sm font-semibold truncate">{lastMsg.from_exhibitor ? email : (lastMsg.sender_name || email)}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg.message}</p>
              </button>
            ))}
          </div>
          <div className="sm:col-span-2">
            {activeThread && (
              <BoothChat
                exhibitorId={myBooth.id}
                threadEmail={activeThread}
                viewerRole="exhibitor"
                viewerName={myBooth.name}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
