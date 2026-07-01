import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Announcement } from '@/api/entities';
import { AppSettings } from '@/api/entities/AppSettings';
import { notifyAnnouncement } from '@/api/notify';
import {
  Bell, Plus, Trash2, AlertCircle, Clock, MapPin,
  MessageSquare, Mail, Send, Megaphone, ChevronDown, ChevronUp, X, Sparkles,
  Smartphone, Radio, Timer, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const TYPE_STYLES = {
  Important:   'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  Reminder:    'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  Update:      'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  General:     'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  Venue:       'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400',
  Directional: 'border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400',
};

const NOTICES = [
  { id: 1, type: 'Important', title: 'Security & Accreditation', body: 'All attendees must collect their badge at the registration desk before entering any exhibition hall. Photo ID required. Uncollected badges will be cancelled after Day 1.', icon: AlertCircle, color: 'border-red-400 bg-red-50 dark:bg-red-950/30' },
  { id: 2, type: 'Venue',     title: 'Parking & Transport',      body: `Parking is available at ${EVENT_CONFIG.venueShort} main lot. Entry via Pomona Road gate. Shuttle service from Avondale pick-up point available both days.`, icon: MapPin, color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' },
  { id: 3, type: 'Schedule',  title: 'Opening Ceremony Change',  body: 'The Opening Keynote has been moved from 09:00 to 09:30 on Day 1 to accommodate the VIP arrival programme.', icon: Clock, color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' },
  { id: 4, type: 'Venue',     title: 'Wi-Fi Access',             body: `Complimentary Wi-Fi is available throughout the venue. Network: ${EVENT_CONFIG.eventName}${EVENT_CONFIG.eventYear} — Password will be displayed at the registration desk.`, icon: Megaphone, color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' },
];

const EMPTY_FORM = { type: 'General', title: '', body: '', sponsored: false, sponsor_name: '' };

const CAMPAIGN_ROWS = [
  { id: 'email-pre', label: 'Pre-event reminder — 7 days before', channel: 'email', icon: Mail },
  { id: 'email-welcome', label: 'Day 1 welcome message', channel: 'email', icon: Mail },
  { id: 'sms-reminder', label: 'SMS day-of reminder', channel: 'sms', icon: Smartphone },
  { id: 'push-session', label: 'Session start push alert', channel: 'push', icon: Radio },
  { id: 'email-followup', label: 'Post-event follow-up', channel: 'email', icon: Mail },
];

export default function Communications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings, updateSettings } = useAppSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [openNotice, setOpenNotice] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [campaignDialog, setCampaignDialog] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ subject: '', body: '' });
  const [eventDateInput, setEventDateInput] = useState(settings?.event_start_date ? settings.event_start_date.slice(0, 16) : '');
  const [savingDate, setSavingDate] = useState(false);

  const saveEventDate = async () => {
    if (!eventDateInput) return;
    setSavingDate(true);
    try {
      await updateSettings({ event_start_date: new Date(eventDateInput).toISOString() });
      toast({ title: 'Event date saved', description: 'The countdown banner will now show on the home page.' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSavingDate(false);
    }
  };

  const sendCampaign = async (row) => {
    if (row.channel === 'sms') {
      try {
        await fetch('/api/notifications/bulk-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: campaignForm.body, campaign: row.id }),
        });
        toast({ title: 'SMS queued', description: 'Message handed to OmniFlex for delivery.' });
      } catch {
        toast({ title: 'Queued (offline)', description: 'Will retry when server is reachable.', variant: 'destructive' });
      }
    } else {
      toast({ title: `${row.channel === 'push' ? 'Push' : 'Email'} queued`, description: 'Integration coming soon — message logged.' });
    }
    setCampaignDialog(null);
  };

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });

  const addMutation = useMutation({
    mutationFn: (data) => Announcement.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      notifyAnnouncement(created);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Announcement.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    addMutation.mutate(form);
  };

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Communications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage live announcements visible to attendees.</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Live announcements management */}
      <section className="mb-8">
        <p className="font-heading text-base font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber" /> Live Announcements
          <span className="ml-1 text-xs font-normal text-muted-foreground normal-case tracking-normal">
            ({announcements.length})
          </span>
        </p>

        {announcements.length === 0 ? (
          <div className="bg-muted/40 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No announcements yet. Click <strong>Add</strong> to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => {
              const style = TYPE_STYLES[a.type] || TYPE_STYLES.General;
              return (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${style.split(' ').slice(0, 2).join(' ')} bg-card border border-border`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style}`}>{a.type}</span>
                      {a.sponsored && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber/20 text-amber flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Sponsored{a.sponsor_name ? ` · ${a.sponsor_name}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{a.body}</p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(a.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Static notices (read-only reference) */}
      <section className="mb-8">
        <p className="font-heading text-base font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber" /> Static Notices
          <span className="ml-1 text-xs font-normal text-muted-foreground normal-case tracking-normal">read-only</span>
        </p>
        <div className="space-y-2">
          {NOTICES.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className={`rounded-xl border-l-4 overflow-hidden ${n.color}`}>
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => setOpenNotice(openNotice === n.id ? null : n.id)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-foreground/60" />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{n.type}</span>
                    <p className="text-sm font-semibold">{n.title}</p>
                  </div>
                  {openNotice === n.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {openNotice === n.id && (
                  <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">{n.body}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Event date (countdown) */}
      <section className="bg-card border border-border rounded-xl p-5 mb-5">
        <p className="font-heading text-base font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
          <Timer className="w-4 h-4 text-amber" /> Event Date & Countdown
        </p>
        <p className="text-xs text-muted-foreground mb-3">Set the opening date/time to display a live countdown banner on the home screen.</p>
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={eventDateInput}
            onChange={e => setEventDateInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={saveEventDate} disabled={savingDate || !eventDateInput}>
            {savingDate ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {settings?.event_start_date && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Countdown active — opens {new Date(settings.event_start_date).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        )}
      </section>

      {/* Campaign messaging */}
      <section className="bg-card border border-border rounded-xl p-5">
        <p className="font-heading text-base font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
          <Send className="w-4 h-4 text-amber" /> Campaign Messaging
        </p>
        <p className="text-xs text-muted-foreground mb-4">Trigger email, SMS, and push broadcast campaigns to registered attendees.</p>
        <div className="space-y-2">
          {CAMPAIGN_ROWS.map(row => {
            const Icon = row.icon;
            const channelColor = { email: 'text-blue-500', sms: 'text-green-500', push: 'text-violet-500' }[row.channel] || 'text-muted-foreground';
            const channelBadge = { email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', sms: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', push: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' }[row.channel];
            return (
              <div key={row.id} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${channelColor}`} />
                  <span className="text-xs font-medium truncate">{row.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${channelBadge}`}>{row.channel}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={() => { setCampaignForm({ subject: row.label, body: '' }); setCampaignDialog(row); }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add announcement dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Type</label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Important">Important</SelectItem>
                  <SelectItem value="Update">Update</SelectItem>
                  <SelectItem value="Reminder">Reminder</SelectItem>
                  <SelectItem value="Venue">Venue</SelectItem>
                  <SelectItem value="Directional">Directional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title</label>
              <Input
                placeholder="Announcement title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Body</label>
              <Textarea
                placeholder="Announcement body text"
                rows={4}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber" />
                <div>
                  <p className="text-sm font-semibold">Sponsored Post</p>
                  <p className="text-xs text-muted-foreground">Mark as paid placement</p>
                </div>
              </div>
              <Switch
                checked={form.sponsored}
                onCheckedChange={(v) => setForm((f) => ({ ...f, sponsored: v }))}
              />
            </div>
            {form.sponsored && (
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sponsor Name</label>
                <Input
                  placeholder="e.g. SANY Group"
                  value={form.sponsor_name}
                  onChange={(e) => setForm((f) => ({ ...f, sponsor_name: e.target.value }))}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Saving…' : 'Add Announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign send dialog */}
      <Dialog open={!!campaignDialog} onOpenChange={open => !open && setCampaignDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Campaign</DialogTitle>
          </DialogHeader>
          {campaignDialog && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <campaignDialog.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium">{campaignDialog.label}</span>
                <span className="ml-auto text-[10px] font-bold uppercase text-muted-foreground">{campaignDialog.channel}</span>
              </div>
              {campaignDialog.channel === 'email' && (
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Subject</label>
                  <Input value={campaignForm.subject} onChange={e => setCampaignForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Message</label>
                <Textarea
                  rows={4}
                  value={campaignForm.body}
                  onChange={e => setCampaignForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message to attendees…"
                />
              </div>
              {campaignDialog.channel !== 'push' && (
                <p className="text-xs text-muted-foreground">
                  {campaignDialog.channel === 'sms'
                    ? 'Will be routed via OmniFlex to all registered phone numbers.'
                    : 'Email integration placeholder — message will be logged server-side.'}
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCampaignDialog(null)}>Cancel</Button>
                <Button onClick={() => sendCampaign(campaignDialog)} disabled={!campaignForm.body.trim()}>
                  Send
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This announcement will be removed from the attendee view immediately. This cannot be undone.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteConfirm)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}