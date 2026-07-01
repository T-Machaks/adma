import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Session, Sponsor } from '@/api/entities';
import {
  Video, Plus, Edit2, Trash2, Radio, Square, Clock, User,
  ExternalLink, Sparkles, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_STYLES = {
  live:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ended:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  speaker_name: '',
  speaker_bio: '',
  start_time: '',
  end_time: '',
  stream_url: '',
  recording_url: '',
  status: 'scheduled',
  sponsor_id: '',
  sponsor_name: '',
  viewer_count: 0,
  chat_enabled: true,
  qa_enabled: true,
  poll_active: false,
  poll_question: '',
  poll_options: '',
};

export default function SessionsManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pollExpanded, setPollExpanded] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => Session.list('start_time'),
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => Sponsor.list(),
  });

  const setF = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setPollExpanded(false);
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    const pollOpts = Array.isArray(s.poll_options) ? s.poll_options.join('\n') : (s.poll_options || '');
    setForm({
      title: s.title || '',
      description: s.description || '',
      speaker_name: s.speaker_name || '',
      speaker_bio: s.speaker_bio || '',
      start_time: s.start_time ? s.start_time.slice(0, 16) : '',
      end_time: s.end_time ? s.end_time.slice(0, 16) : '',
      stream_url: s.stream_url || '',
      recording_url: s.recording_url || '',
      status: s.status || 'scheduled',
      sponsor_id: s.sponsor_id || '',
      sponsor_name: s.sponsor_name || '',
      viewer_count: s.viewer_count || 0,
      chat_enabled: s.chat_enabled !== false,
      qa_enabled: s.qa_enabled !== false,
      poll_active: !!s.poll_active,
      poll_question: s.poll_question || '',
      poll_options: pollOpts,
    });
    setPollExpanded(!!s.poll_active);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? Session.update(editId, data) : Session.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Session.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setDeleteConfirm(null);
    },
  });

  const quickStatus = useMutation({
    mutationFn: ({ id, status }) => Session.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const pollOptions = form.poll_options
      ? form.poll_options.split('\n').map(s => s.trim()).filter(Boolean)
      : [];
    const data = {
      ...form,
      start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      viewer_count: Number(form.viewer_count) || 0,
      poll_options: pollOptions,
    };
    // Attach sponsor name from selection
    if (form.sponsor_id) {
      const sp = sponsors.find(s => s.id === form.sponsor_id);
      if (sp) data.sponsor_name = sp.name;
    }
    saveMutation.mutate(data);
  };

  const live = sessions.filter(s => s.status === 'live');
  const scheduled = sessions.filter(s => s.status === 'scheduled');
  const ended = sessions.filter(s => s.status === 'ended');

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Sessions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage live sessions, webinars, and panel talks.</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Session
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Live Now', value: live.length, color: 'text-red-500', dot: live.length > 0 },
          { label: 'Scheduled', value: scheduled.length, color: 'text-blue-500' },
          { label: 'Ended', value: ended.length, color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-heading text-3xl font-bold ${s.color} flex items-center justify-center gap-1.5`}>
              {s.dot && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
              {s.value}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-8 text-center">Loading sessions…</div>}

      {!isLoading && sessions.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No sessions yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create the first session to get started.</p>
          <Button onClick={openCreate} variant="outline">Add Session</Button>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map(s => {
            const status = STATUS_STYLES[s.status] || STATUS_STYLES.scheduled;
            const fmt = s.start_time
              ? new Date(s.start_time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : null;
            return (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${status}`}>{s.status}</span>
                    {s.sponsor_name && (
                      <span className="text-[10px] font-bold text-amber flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> {s.sponsor_name}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-foreground">{s.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {s.speaker_name && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" /> {s.speaker_name}
                      </span>
                    )}
                    {fmt && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {fmt}
                      </span>
                    )}
                    {s.viewer_count > 0 && (
                      <span className="text-xs text-red-500 font-semibold">{s.viewer_count} watching</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {s.status !== 'live' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => quickStatus.mutate({ id: s.id, status: 'live' })}
                    >
                      <Radio className="w-3 h-3 mr-1" /> Go Live
                    </Button>
                  )}
                  {s.status === 'live' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => quickStatus.mutate({ id: s.id, status: 'ended' })}
                    >
                      <Square className="w-3 h-3 mr-1" /> End
                    </Button>
                  )}
                  {s.status === 'ended' && s.recording_url && (
                    <a href={s.recording_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <RotateCcw className="w-3 h-3 mr-1" /> Replay
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteConfirm(s.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Session' : 'New Session'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title *</label>
              <Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Session title" required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Speaker Name</label>
                <Input value={form.speaker_name} onChange={e => setF('speaker_name', e.target.value)} placeholder="Name" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Speaker Bio</label>
                <Input value={form.speaker_bio} onChange={e => setF('speaker_bio', e.target.value)} placeholder="Title / role" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Start Time</label>
                <Input type="datetime-local" value={form.start_time} onChange={e => setF('start_time', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">End Time</label>
                <Input type="datetime-local" value={form.end_time} onChange={e => setF('end_time', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Stream URL</label>
              <Input value={form.stream_url} onChange={e => setF('stream_url', e.target.value)} placeholder="YouTube/Vimeo embed URL" />
              <p className="text-[10px] text-muted-foreground mt-1">Use the embed URL (e.g. youtube.com/embed/…)</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Recording URL (replay)</label>
              <Input value={form.recording_url} onChange={e => setF('recording_url', e.target.value)} placeholder="Replay embed URL" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
              <Select value={form.status} onValueChange={v => setF('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sponsor</label>
              <Select value={form.sponsor_id || 'none'} onValueChange={v => setF('sponsor_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No sponsor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sponsor</SelectItem>
                  {sponsors.map(sp => <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm font-medium">Chat enabled</span>
                <Switch checked={form.chat_enabled} onCheckedChange={v => setF('chat_enabled', v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <span className="text-sm font-medium">Q&A enabled</span>
                <Switch checked={form.qa_enabled} onCheckedChange={v => setF('qa_enabled', v)} />
              </div>
            </div>

            {/* Poll section */}
            <div className="rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setPollExpanded(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <span>Poll settings</span>
                <Switch checked={form.poll_active} onCheckedChange={v => { setF('poll_active', v); setPollExpanded(v); }} onClick={e => e.stopPropagation()} />
              </button>
              {(pollExpanded || form.poll_active) && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Poll Question</label>
                    <Input value={form.poll_question} onChange={e => setF('poll_question', e.target.value)} placeholder="What is your question?" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Options (one per line)</label>
                    <Textarea
                      value={form.poll_options}
                      onChange={e => setF('poll_options', e.target.value)}
                      rows={3}
                      placeholder={"Option A\nOption B\nOption C"}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Session'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Session</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This session and all its settings will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm)}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
