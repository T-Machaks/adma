import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Announcement, Campaign } from '@/api/entities';
import { notifyAnnouncement } from '@/api/notify';
import { apiFetch } from '@/api/client';
import {
  Bell, Plus, Trash2, Edit2,
  Mail, Send, Sparkles,
  Smartphone, Timer, CheckCircle2,
  Users, Building2, UserCog, Loader2, AlertTriangle,
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAppSettings } from '@/lib/AppSettingsContext';

const TYPE_STYLES = {
  Important:   'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  Reminder:    'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  Update:      'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  General:     'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  Venue:       'border-violet-400 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400',
  Directional: 'border-teal-400 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400',
};

const EMPTY_FORM = { type: 'General', title: '', body: '', sponsored: false, sponsor_name: '' };
const EMPTY_CAMPAIGN_FORM = { label: '', subject: '', body: '' };

const AUDIENCE_GROUP_OPTIONS = [
  { key: 'attendees',  label: 'Attendees',  desc: 'Confirmed / Checked In registrations', icon: Users },
  { key: 'exhibitors', label: 'Exhibitors', desc: 'Exhibitor booth contacts',              icon: Building2 },
  { key: 'users',      label: 'Accounts',   desc: 'Every login account, any role',         icon: UserCog },
];

export default function Communications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings, updateSettings } = useAppSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [eventDateInput, setEventDateInput] = useState(settings?.event_start_date ? settings.event_start_date.slice(0, 16) : '');
  const [savingDate, setSavingDate] = useState(false);

  // Campaign templates (editable, DB-backed — see server/routes/campaigns.js)
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [deleteCampaignConfirm, setDeleteCampaignConfirm] = useState(null);

  // Send dialog — channel + audience are chosen per-send, not fixed on the campaign
  const [sendDialogCampaign, setSendDialogCampaign] = useState(null);
  const [sendForm, setSendForm] = useState({ subject: '', body: '' });
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sendGroups, setSendGroups] = useState({ attendees: true, exhibitors: false, users: false });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

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

  const selectedGroups = useMemo(
    () => Object.entries(sendGroups).filter(([, v]) => v).map(([k]) => k),
    [sendGroups]
  );
  const channel = sendEmail && sendSms ? 'both' : sendEmail ? 'email' : sendSms ? 'sms' : null;

  // Live recipient counts for the groups currently selected — fetched fresh every time
  // the group selection changes, and shown before Send is even clickable. This is the
  // actual safeguard for a broadcast this size: the organizer sees real numbers, not
  // just a generic confirm dialog, before anything goes out.
  const { data: audience, isFetching: loadingAudience } = useQuery({
    queryKey: ['broadcast-audience', selectedGroups.join(',')],
    queryFn: () => apiFetch(`/api/notifications/broadcast-audience?groups=${selectedGroups.join(',')}`),
    enabled: !!sendDialogCampaign && selectedGroups.length > 0,
  });

  const openSendDialog = (campaign) => {
    setSendForm({ subject: campaign.subject || '', body: campaign.body || '' });
    setSendEmail(true);
    setSendSms(false);
    setSendGroups({ attendees: true, exhibitors: false, users: false });
    setSendDialogCampaign(campaign);
  };

  const sendBroadcast = async () => {
    if (!channel || !selectedGroups.length || !sendForm.body.trim()) return;
    setSendingBroadcast(true);
    try {
      // apiFetch (not raw fetch) — fetch() doesn't reject on a non-2xx response, so a
      // real server-side failure (missing OMNIFLEX_API_KEY/MAILER_*, etc.) would
      // otherwise be silently swallowed and still show a success toast.
      const result = await apiFetch('/api/notifications/broadcast', {
        method: 'POST',
        body: { channel, subject: sendForm.subject, message: sendForm.body, campaign: sendDialogCampaign.id, groups: selectedGroups },
      });
      const parts = [];
      if (result.email) parts.push(`Email: ${result.email.sent}/${result.email.targeted} sent${result.email.failed ? `, ${result.email.failed} failed` : ''}`);
      // SMS goes through one OmniFlex campaign covering every recipient, not a
      // per-recipient loop, so there's no synchronous sent/failed count the way email
      // has — OmniFlex dispatches it a few seconds later. `targeted` is our own
      // recipient count, not the campaign API's total_recipients/sent_count fields,
      // which stay 0 at creation time regardless of how many recipients were attached.
      if (result.sms) parts.push(result.sms.campaignId ? `SMS: campaign created for ${result.sms.targeted} recipients` : 'SMS: no valid phone numbers in the selected audience');
      const anyFailed = (result.email?.failed || 0) > 0;
      toast({
        title: anyFailed ? 'Broadcast sent with some failures' : 'Broadcast sent',
        description: parts.join(' · '),
        variant: anyFailed ? 'destructive' : undefined,
      });
      setSendDialogCampaign(null);
    } catch (e) {
      toast({ title: 'Send failed', description: e.message, variant: 'destructive' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => Announcement.list('-created_date'),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => Campaign.list('-created_date'),
  });

  const addCampaignMutation = useMutation({
    mutationFn: (data) => Campaign.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignDialogOpen(false);
      setCampaignForm(EMPTY_CAMPAIGN_FORM);
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }) => Campaign.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignDialogOpen(false);
      setEditingCampaignId(null);
      setCampaignForm(EMPTY_CAMPAIGN_FORM);
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => Campaign.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setDeleteCampaignConfirm(null);
    },
  });

  const openAddCampaignDialog = () => {
    setEditingCampaignId(null);
    setCampaignForm(EMPTY_CAMPAIGN_FORM);
    setCampaignDialogOpen(true);
  };

  const openEditCampaignDialog = (c) => {
    setEditingCampaignId(c.id);
    setCampaignForm({ label: c.label || '', subject: c.subject || '', body: c.body || '' });
    setCampaignDialogOpen(true);
  };

  const handleCampaignSubmit = (e) => {
    e.preventDefault();
    if (!campaignForm.label.trim() || !campaignForm.body.trim()) return;
    if (editingCampaignId) {
      updateCampaignMutation.mutate({ id: editingCampaignId, data: campaignForm });
    } else {
      addCampaignMutation.mutate(campaignForm);
    }
  };

  const addMutation = useMutation({
    mutationFn: (data) => Announcement.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      notifyAnnouncement(created);
    },
  });

  // Edit deliberately does NOT re-notify (notifyAnnouncement is only called from
  // addMutation above) — fixing a typo in an existing announcement shouldn't push a
  // fresh notification to every attendee the way a genuinely new one should.
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Announcement.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Announcement.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteConfirm(null);
    },
  });

  const openAddDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (a) => {
    setEditingId(a.id);
    setForm({ type: a.type || 'General', title: a.title || '', body: a.body || '', sponsored: !!a.sponsored, sponsor_name: a.sponsor_name || '' });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      addMutation.mutate(form);
    }
  };

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Communications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage live announcements visible to attendees.</p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-2">
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
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={() => openEditDialog(a)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Edit announcement"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(a.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      aria-label="Delete announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="flex items-start justify-between mb-1 gap-3">
          <p className="font-heading text-base font-bold uppercase tracking-wide flex items-center gap-2">
            <Send className="w-4 h-4 text-amber" /> Campaign Messaging
          </p>
          <Button size="sm" onClick={openAddCampaignDialog} className="flex items-center gap-1.5 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Editable message templates — send each one by email, SMS, or both, to whichever of attendees / exhibitors / accounts you choose.</p>
        {campaigns.length === 0 ? (
          <div className="bg-muted/40 border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground text-xs">
            No campaigns yet. Click <strong>New</strong> to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{c.label}</p>
                  {c.subject && <p className="text-[11px] text-muted-foreground truncate">{c.subject}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => openSendDialog(c)}>Send</Button>
                  <button onClick={() => openEditCampaignDialog(c)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors" aria-label="Edit campaign">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteCampaignConfirm(c.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" aria-label="Delete campaign">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add/Edit announcement dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
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
              <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                {addMutation.isPending || updateMutation.isPending ? 'Saving…' : editingId ? 'Save Changes' : 'Add Announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit campaign dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampaignId ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCampaignSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Label</label>
              <Input
                placeholder="e.g. Pre-event reminder — 7 days before"
                value={campaignForm.label}
                onChange={(e) => setCampaignForm((f) => ({ ...f, label: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Email Subject</label>
              <Input
                placeholder="Used when sent by email — ignored for SMS-only sends"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Message</label>
              <Textarea
                placeholder="Write the campaign message…"
                rows={5}
                value={campaignForm.body}
                onChange={(e) => setCampaignForm((f) => ({ ...f, body: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCampaignDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addCampaignMutation.isPending || updateCampaignMutation.isPending}>
                {addCampaignMutation.isPending || updateCampaignMutation.isPending ? 'Saving…' : editingCampaignId ? 'Save Changes' : 'Add Campaign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send broadcast dialog — channel + audience chosen here, at send time */}
      <Dialog open={!!sendDialogCampaign} onOpenChange={open => !open && setSendDialogCampaign(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send: {sendDialogCampaign?.label}</DialogTitle>
          </DialogHeader>
          {sendDialogCampaign && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Channel</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border flex-1 cursor-pointer">
                    <Checkbox checked={sendEmail} onCheckedChange={v => setSendEmail(!!v)} />
                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-medium">Email</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border flex-1 cursor-pointer">
                    <Checkbox checked={sendSms} onCheckedChange={v => setSendSms(!!v)} />
                    <Smartphone className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium">SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Audience</label>
                <div className="space-y-1.5">
                  {AUDIENCE_GROUP_OPTIONS.map(g => {
                    const Icon = g.icon;
                    return (
                      <label key={g.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border cursor-pointer">
                        <Checkbox
                          checked={sendGroups[g.key]}
                          onCheckedChange={v => setSendGroups(s => ({ ...s, [g.key]: !!v }))}
                        />
                        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{g.label}</p>
                          <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {sendEmail && (
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Subject</label>
                  <Input value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Message</label>
                <Textarea
                  rows={4}
                  value={sendForm.body}
                  onChange={e => setSendForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message…"
                />
              </div>

              {/* Real recipient counts — the actual safeguard before Send is even
                  clickable, not just a generic confirm dialog. */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted text-xs">
                {selectedGroups.length === 0 ? (
                  <span className="text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Select at least one audience group.</span>
                ) : !channel ? (
                  <span className="text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Select at least one channel.</span>
                ) : loadingAudience ? (
                  <span className="text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Counting recipients…</span>
                ) : audience ? (
                  <span className="font-medium">
                    This will reach{sendEmail && ` ${audience.emailCount} by email`}{sendEmail && sendSms && ' and'}{sendSms && ` ${audience.smsCount} by SMS`}.
                  </span>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSendDialogCampaign(null)}>Cancel</Button>
                <Button
                  onClick={sendBroadcast}
                  disabled={!channel || !selectedGroups.length || !sendForm.body.trim() || loadingAudience || !audience || sendingBroadcast}
                >
                  {sendingBroadcast ? 'Sending…' : 'Send Broadcast'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete announcement confirm dialog */}
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

      {/* Delete campaign confirm dialog */}
      <Dialog open={!!deleteCampaignConfirm} onOpenChange={(open) => !open && setDeleteCampaignConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This campaign template will be removed. This cannot be undone.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteCampaignConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteCampaignMutation.isPending}
              onClick={() => deleteCampaignMutation.mutate(deleteCampaignConfirm)}
            >
              {deleteCampaignMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}