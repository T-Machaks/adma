import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Session } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { ChevronLeft, MessageSquare, HelpCircle, BarChart3, User, Radio } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StreamEmbed from '@/components/video/StreamEmbed';
import ViewerCounter from '@/components/video/ViewerCounter';
import SponsoredSessionBadge from '@/components/video/SponsoredSessionBadge';
import PreRollSlot from '@/components/video/PreRollSlot';
import VideoAdBanner from '@/components/video/VideoAdBanner';
import LiveChat from '@/components/video/LiveChat';
import QAPanel from '@/components/video/QAPanel';
import PollWidget from '@/components/video/PollWidget';
import ModeratorBar from '@/components/video/ModeratorBar';
import { AdSlot } from '@/api/entities';

export default function LiveRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isOrganizer = user?.role === 'organizer' || user?.role === 'superadmin';

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => Session.get(id),
    refetchInterval: 15000,
  });

  const { data: preRollAds = [] } = useQuery({
    queryKey: ['adslots-active'],
    queryFn: () => AdSlot.listActive(),
    select: (data) => data.filter(s => s.placement === 'pre-roll' && s.active),
  });

  const [preRollDone, setPreRollDone] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => Session.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', id] }),
  });

  const handlePollVote = (option) => {
    const rawVotes = session?.poll_votes;
    const current = (() => {
      if (!rawVotes) return {};
      if (typeof rawVotes === 'object') return rawVotes;
      try { return JSON.parse(rawVotes); } catch { return {}; }
    })();
    const updated = { ...current, [option]: (current[option] || 0) + 1 };
    updateMutation.mutate({ poll_votes: updated });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-16 text-center px-4">
        <p className="font-semibold text-foreground mb-2">Session not found</p>
        <Link to="/sessions" className="text-amber text-sm">Back to sessions</Link>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const preRollAd = preRollAds[0];
  const showPreRoll = isLive && !preRollDone && !!preRollAd;

  return (
    <div className="pb-20 max-w-7xl mx-auto">
      {/* Back nav */}
      <div className="px-4 pt-4 pb-2">
        <Link to="/sessions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> All Sessions
        </Link>
      </div>

      {isOrganizer && (
        <div className="px-4 mb-3">
          <ModeratorBar
            session={session}
            onUpdate={(data) => updateMutation.mutate(data)}
            isPending={updateMutation.isPending}
          />
        </div>
      )}

      <div className="px-4 flex flex-col lg:flex-row gap-4">
        {/* Main stream area */}
        <div className="flex-1 min-w-0">
          {session.sponsor_name && (
            <div className="mb-2">
              <SponsoredSessionBadge sponsorName={session.sponsor_name} sponsorLogo={session.sponsor_logo} />
            </div>
          )}

          {showPreRoll ? (
            <PreRollSlot ad={preRollAd} onComplete={() => setPreRollDone(true)} />
          ) : (
            <StreamEmbed
              url={isLive ? session.stream_url : (session.status === 'ended' ? session.recording_url : null)}
              title={session.title}
            />
          )}

          <div className="mt-2">
            <VideoAdBanner />
          </div>

          {/* Session info */}
          <div className="mt-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {isLive && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                    </span>
                  )}
                  {session.status === 'ended' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-500 text-white">Ended</span>
                  )}
                  {isLive && <ViewerCounter count={session.viewer_count} />}
                </div>
                <h1 className="font-heading text-xl font-bold text-foreground leading-snug">{session.title}</h1>
                {session.speaker_name && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber flex items-center justify-center flex-shrink-0">
                      {session.speaker_avatar
                        ? <img src={session.speaker_avatar} alt={session.speaker_name} className="w-6 h-6 rounded-full object-cover" />
                        : <User className="w-3.5 h-3.5 text-white" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{session.speaker_name}</p>
                      {session.speaker_bio && <p className="text-xs text-muted-foreground">{session.speaker_bio}</p>}
                    </div>
                  </div>
                )}
                {session.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{session.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ height: 'min(600px, 70vh)' }}>
            <Tabs defaultValue="chat" className="flex flex-col h-full">
              <TabsList className="flex-shrink-0 rounded-none border-b border-border bg-muted/50 w-full grid grid-cols-3">
                <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs rounded-none">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </TabsTrigger>
                <TabsTrigger value="qa" className="flex items-center gap-1.5 text-xs rounded-none">
                  <HelpCircle className="w-3.5 h-3.5" /> Q&A
                </TabsTrigger>
                <TabsTrigger value="poll" className="flex items-center gap-1.5 text-xs rounded-none">
                  <BarChart3 className="w-3.5 h-3.5" /> Poll
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex data-[state=inactive]:hidden">
                <LiveChat sessionId={id} enabled={session.chat_enabled} />
              </TabsContent>

              <TabsContent value="qa" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex data-[state=inactive]:hidden">
                <QAPanel sessionId={id} enabled={session.qa_enabled} isOrganizer={isOrganizer} />
              </TabsContent>

              <TabsContent value="poll" className="flex-1 overflow-y-auto mt-0">
                <PollWidget
                  sessionId={id}
                  session={session}
                  onVote={handlePollVote}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
