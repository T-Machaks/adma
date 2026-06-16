import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttendeeNote, MeetingRequest, Announcement } from '@/api/entities';
import { Star, Bookmark, FileText, Calendar, Bell, Trash2, Plus, X, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

const SESSIONS = [
  { id: 's1', title: 'Opening Keynote: Future of Mining in Southern Africa', time: '09:00', day: 'Day 1', location: 'Main Stage' },
  { id: 's2', title: 'Panel: Sustainable Mining Practices', time: '10:00', day: 'Day 1', location: 'Conference Tent' },
  { id: 's3', title: 'Equipment Live Demo — Heavy Machinery', time: '11:30', day: 'Day 1', location: 'Outdoor Demo Zone' },
  { id: 's4', title: 'Keynote: Infrastructure Investment in Zimbabwe', time: '09:30', day: 'Day 2', location: 'Main Stage' },
  { id: 's5', title: 'Roundtable: Procurement Trends in Construction', time: '12:00', day: 'Day 2', location: 'Conference Tent' },
  { id: 's6', title: 'Closing Keynote & Industry Awards', time: '12:00', day: 'Day 3', location: 'Main Stage' },
];

const USER_EMAIL = 'visitor@minecon.demo';

export default function AttendeeDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('saved');
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');

  const { data: notes = [] } = useQuery({
    queryKey: ['attendee-notes'],
    queryFn: () => AttendeeNote.filter({ user_email: USER_EMAIL }),
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });

  const addNote = useMutation({
    mutationFn: (data) => AttendeeNote.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendee-notes'] }); setNoteModal(null); setNoteText(''); },
  });
  const deleteNote = useMutation({
    mutationFn: (id) => AttendeeNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendee-notes'] }),
  });
  const toggleFav = useMutation({
    mutationFn: ({ id, val }) => AttendeeNote.update(id, { is_favorite: val }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendee-notes'] }),
  });

  const favorites = notes.filter(n => n.is_favorite);
  const bookmarks = notes.filter(n => !n.is_favorite);
  const tabs = [
    { id: 'saved', label: 'Saved', icon: Star, count: favorites.length },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, count: bookmarks.length },
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: SESSIONS.length },
    { id: 'meetings', label: 'Meetings', icon: MessageSquare, count: meetings.length },
    { id: 'updates', label: 'Updates', icon: Bell, count: announcements.length },
  ];

  const addSession = (s) => {
    const exists = notes.find(n => n.ref_id === s.id);
    if (!exists) addNote.mutate({ user_email: USER_EMAIL, type: 'Session', ref_id: s.id, ref_name: s.title, note: '', is_favorite: true });
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">My MineCon</h1>
          <p className="text-muted-foreground text-sm">Attendee dashboard — plan your visit</p>
        </div>
        <div className="bg-amber/10 border border-amber/30 text-amber text-xs font-bold px-2.5 py-1.5 rounded-lg">DEMO</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: 'Saved', value: favorites.length, color: 'text-amber' },
          { label: 'Notes', value: notes.length, color: 'text-blue-500' },
          { label: 'Meetings', value: meetings.length, color: 'text-violet-500' },
          { label: 'Sessions', value: notes.filter(n => n.type === 'Session').length, color: 'text-emerald-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`font-heading text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${activeTab === t.id ? 'bg-steel text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-3.5 h-3.5" />{t.label}
              {t.count > 0 && <span className={`text-[10px] px-1 rounded-full ${activeTab === t.id ? 'bg-white/20' : 'bg-muted-foreground/20'}`}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Saved Exhibitors */}
      {activeTab === 'saved' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Favourite Exhibitors & Sessions</p>
            <Link to="/exhibitors" className="text-amber text-xs font-medium">+ Add from directory</Link>
          </div>
          {favorites.length === 0 ? (
            <EmptyState icon={Star} msg="No favourites yet. Browse exhibitors and save the ones you want to visit." action={{ label: 'Browse Exhibitors', to: '/exhibitors' }} />
          ) : (
            <div className="space-y-2">
              {favorites.map(n => <NoteCard key={n.id} note={n} onDelete={() => deleteNote.mutate(n.id)} onToggleFav={() => toggleFav.mutate({ id: n.id, val: false })} onNote={() => { setNoteModal(n); setNoteText(n.note || ''); }} />)}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks */}
      {activeTab === 'bookmarks' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Bookmarked Items</p>
          </div>
          {bookmarks.length === 0 ? (
            <EmptyState icon={Bookmark} msg="No bookmarks yet. Add notes while browsing exhibitors or sessions." />
          ) : (
            <div className="space-y-2">
              {bookmarks.map(n => <NoteCard key={n.id} note={n} onDelete={() => deleteNote.mutate(n.id)} onToggleFav={() => toggleFav.mutate({ id: n.id, val: true })} onNote={() => { setNoteModal(n); setNoteText(n.note || ''); }} />)}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-2">
          {['Day 1', 'Day 2', 'Day 3'].map(day => (
            <div key={day}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{day}</p>
              {SESSIONS.filter(s => s.day === day).map(s => {
                const saved = notes.find(n => n.ref_id === s.id);
                return (
                  <div key={s.id} className="bg-card border border-border rounded-xl p-3 mb-2 flex items-start gap-3">
                    <div className="flex-shrink-0 text-right w-10">
                      <p className="text-xs font-bold">{s.time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold leading-snug">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.location}</p>
                    </div>
                    <button onClick={() => saved ? deleteNote.mutate(saved.id) : addSession(s)}
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${saved ? 'bg-amber/10 text-amber' : 'bg-muted text-muted-foreground hover:text-amber'}`}>
                      <Star className={`w-4 h-4 ${saved ? 'fill-amber text-amber' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Meetings */}
      {activeTab === 'meetings' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">My Meeting Requests</p>
            <Link to="/meetings" className="text-amber text-xs font-medium">+ New meeting</Link>
          </div>
          {meetings.length === 0 ? (
            <EmptyState icon={MessageSquare} msg="No meeting requests yet." action={{ label: 'Book a Meeting', to: '/meetings' }} />
          ) : (
            <div className="space-y-2">
              {meetings.map(m => (
                <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{m.exhibitor_name}</p>
                      <p className="text-xs text-muted-foreground">Booth {m.exhibitor_booth} · {m.preferred_date} at {m.preferred_time}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.visitor_name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full h-fit ${m.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Updates */}
      {activeTab === 'updates' && (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex gap-2 items-start justify-between">
                <p className="font-semibold text-sm">{a.title}</p>
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium flex-shrink-0">{a.type}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setNoteModal(null)}>
          <div className="bg-card w-full rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm truncate">{noteModal.ref_name}</p>
              <button onClick={() => setNoteModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Add your notes here…"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none mb-3" />
            <button onClick={() => { AttendeeNote.update(noteModal.id, { note: noteText }); queryClient.invalidateQueries({ queryKey: ['attendee-notes'] }); setNoteModal(null); }}
              className="w-full py-2.5 bg-amber text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">Save Note</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onDelete, onToggleFav, onNote }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{note.ref_name}</p>
        <p className="text-xs text-muted-foreground">{note.type}</p>
        {note.note && <p className="text-xs text-foreground/70 mt-1 line-clamp-2 italic">"{note.note}"</p>}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button onClick={onNote} className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 transition-colors"><FileText className="w-3.5 h-3.5 text-muted-foreground" /></button>
        <button onClick={onToggleFav} className="p-1.5 rounded-lg bg-muted hover:bg-amber/10 transition-colors"><Star className={`w-3.5 h-3.5 ${note.is_favorite ? 'fill-amber text-amber' : 'text-muted-foreground'}`} /></button>
        <button onClick={onDelete} className="p-1.5 rounded-lg bg-muted hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, msg, action }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{msg}</p>
      {action && <Link to={action.to} className="inline-block mt-3 text-amber text-sm font-medium underline">{action.label}</Link>}
    </div>
  );
}
