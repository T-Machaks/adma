import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Session } from '@/api/entities';
import { Video, Radio, Clock, Users, Play, RotateCcw, Sparkles, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import SponsoredSessionBadge from '@/components/video/SponsoredSessionBadge';
import ViewerCounter from '@/components/video/ViewerCounter';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const STATUS_STYLES = {
  live:      { label: 'LIVE', class: 'bg-red-500 text-white animate-pulse' },
  scheduled: { label: 'UPCOMING', class: 'bg-blue-500 text-white' },
  ended:     { label: 'ENDED', class: 'bg-slate-500 text-white' },
};

function SessionCard({ session }) {
  const statusInfo = STATUS_STYLES[session.status] || STATUS_STYLES.scheduled;
  const isLive = session.status === 'live';
  const isEnded = session.status === 'ended';

  const formattedTime = session.start_time
    ? new Date(session.start_time).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-150 hover:shadow-md ${isLive ? 'border-red-400 shadow-red-500/10 shadow-lg' : 'border-border'}`}>
      {/* Thumbnail / status strip */}
      <div className={`relative px-4 py-3 ${isLive ? 'bg-gradient-to-r from-red-950/50 to-slate-900/50' : 'bg-muted/30'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusInfo.class}`}>
            {statusInfo.label}
          </span>
          {session.sponsor_name && (
            <SponsoredSessionBadge sponsorName={session.sponsor_name} compact />
          )}
          {isLive && <ViewerCounter count={session.viewer_count} />}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-base text-foreground leading-snug mb-1">{session.title}</h3>
        {session.speaker_name && (
          <p className="text-sm text-muted-foreground mb-1">
            <span className="text-amber font-medium">{session.speaker_name}</span>
          </p>
        )}
        {formattedTime && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Clock className="w-3 h-3" />
            {formattedTime}
          </div>
        )}
        {session.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{session.description}</p>
        )}

        <Link
          to={`/sessions/${session.id}`}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            isLive
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isEnded
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'bg-amber hover:bg-amber/90 text-white'
          }`}
        >
          {isLive ? <><Radio className="w-4 h-4" /> Join Live</> : isEnded ? <><Play className="w-4 h-4" /> Watch Replay</> : <><Calendar className="w-4 h-4" /> View Session</>}
        </Link>
      </div>
    </div>
  );
}

export default function LiveSessions() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => Session.list('start_time'),
    refetchInterval: 30000,
  });

  const live = sessions.filter(s => s.status === 'live');
  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const replays = sessions.filter(s => s.status === 'ended' && s.recording_url);

  return (
    <div className="pb-24 px-4 pt-5 max-w-4xl lg:max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Video className="w-6 h-6 text-amber" /> Live Sessions
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Virtual sessions, webinars, and panel talks from {EVENT_CONFIG.eventFullName}.</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl h-56 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Video className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No sessions scheduled yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Session schedule will appear here as the event approaches.</p>
        </div>
      )}

      {!isLoading && sessions.length > 0 && (
        <Tabs defaultValue={live.length > 0 ? 'live' : 'upcoming'}>
          <TabsList className="mb-5">
            <TabsTrigger value="live" className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              Live Now
              {live.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{live.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="replay" className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              Replay ({replays.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {live.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No sessions are live right now.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {live.map(s => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcoming.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No upcoming sessions scheduled.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map(s => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="replay">
            {replays.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No recordings available yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {replays.map(s => <SessionCard key={s.id} session={s} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
