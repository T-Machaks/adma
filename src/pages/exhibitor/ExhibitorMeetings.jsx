import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, MeetingRequest } from '@/api/entities';
import { notifyMeeting } from '@/api/notify';
import { useAuth } from '@/lib/AuthContext';
import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Users, Mail, Filter } from 'lucide-react';

const STATUS_STYLES = {
  Pending:   { cls: 'bg-amber-100 text-amber-700',   icon: Clock },
  Confirmed: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  Declined:  { cls: 'bg-red-100 text-red-700',        icon: XCircle },
};

const FILTERS = ['All', 'Pending', 'Confirmed', 'Declined'];

export default function ExhibitorMeetings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState(null);
  const [updateError, setUpdateError] = useState(null);
  const [filter, setFilter] = useState('All');

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const myBooth = exhibitors.find(e =>
    e.contact_email?.toLowerCase() === user?.email?.toLowerCase() ||
    (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? null;

  const myMeetings = meetings.filter(m => {
    if (!myBooth) return false;
    return (
      m.exhibitor_id === myBooth.id ||
      m.exhibitor_name?.toLowerCase() === myBooth.name?.toLowerCase()
    );
  });

  const filtered = filter === 'All' ? myMeetings : myMeetings.filter(m => m.status === filter);

  const pending   = myMeetings.filter(m => m.status === 'Pending').length;
  const confirmed = myMeetings.filter(m => m.status === 'Confirmed').length;

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => MeetingRequest.update(id, { status }),
    onSuccess: (updated) => {
      setUpdateError(null);
      qc.invalidateQueries({ queryKey: ['meetings-all'] });
      const action = updated.status === 'Confirmed' ? 'confirmed' : 'declined';
      notifyMeeting(updated, action);
    },
    onSettled: () => setUpdatingId(null),
    onError: (err) => setUpdateError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Meeting Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {pending > 0 ? `${pending} pending request${pending > 1 ? 's' : ''} need your response` : 'All requests have been handled'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',     value: myMeetings.length, icon: Calendar },
          { label: 'Pending',   value: pending,            icon: Clock },
          { label: 'Confirmed', value: confirmed,          icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-amber" />
            </div>
            <div>
              <div className="font-heading text-xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 touch-manipulation ${
              filter === f ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
            {f === 'Pending' && pending > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-amber text-white rounded-full text-[9px] font-bold">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {updateError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          Failed to update: {updateError}
        </div>
      )}

      {/* Meeting list */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} meeting requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const cfg = STATUS_STYLES[m.status] ?? STATUS_STYLES.Pending;
            const StatusIcon = cfg.icon;
            const isPending = m.status === 'Pending';
            return (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{m.visitor_name || m.attendee_name || 'Attendee'}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {m.status}
                      </span>
                    </div>
                    {m.visitor_company && <p className="text-xs text-muted-foreground mt-0.5">{m.visitor_company}</p>}
                    {(m.reason || m.message) && (
                      <p className="text-sm text-foreground mt-1">{m.reason || m.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {m.preferred_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {m.preferred_date}{m.preferred_time ? ` at ${m.preferred_time}` : ''}
                    </span>
                  )}
                  {(m.visitor_email || m.attendee_email) && (
                    <a
                      href={`mailto:${m.visitor_email || m.attendee_email}`}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {m.visitor_email || m.attendee_email}
                    </a>
                  )}
                </div>

                {isPending && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={updatingId === m.id}
                      onClick={() => { setUpdateError(null); setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Confirmed' }); }}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white py-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {updatingId === m.id ? 'Saving…' : 'Confirm Meeting'}
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === m.id}
                      onClick={() => { setUpdateError(null); setUpdatingId(m.id); updateStatus.mutate({ id: m.id, status: 'Declined' }); }}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200 py-3 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
