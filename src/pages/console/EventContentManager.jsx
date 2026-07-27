import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EventInfo as EventInfoEntity, ScheduleContent } from '@/api/entities';
import { useAppSettings } from '@/lib/AppSettingsContext';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, Loader2,
  Info as InfoIcon, CalendarClock, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

function Section({ title, icon, expanded, onToggle, children }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={onToggle}
        type="button"
      >
        <span className="font-heading text-sm font-bold uppercase tracking-wide flex items-center gap-2">
          {icon} {title}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="border-t border-border p-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function RowActions({ index, total, onMove, onRemove }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
      <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="p-1 rounded hover:bg-muted disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={onRemove} className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// Generic immutable helpers for editing an array field on a draft object.
function makeListHelpers(setDraft) {
  return {
    update: (key, i, value) => setDraft(d => ({ ...d, [key]: d[key].map((item, idx) => (idx === i ? value : item)) })),
    add: (key, item) => setDraft(d => ({ ...d, [key]: [...(d[key] || []), item] })),
    remove: (key, i) => setDraft(d => ({ ...d, [key]: d[key].filter((_, idx) => idx !== i) })),
    move: (key, i, dir) => setDraft(d => {
      const arr = [...d[key]];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, [key]: arr };
    }),
  };
}

const TIER_COLOR_OPTIONS = [
  { value: 'bg-emerald-100 text-emerald-700', label: 'Emerald (Platinum)' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Yellow (Gold)' },
  { value: 'bg-slate-100 text-slate-600', label: 'Slate (Silver)' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange (Bronze)' },
];

const SESSION_TYPES = ['keynote', 'panel', 'session', 'demo', 'networking', 'sponsored', 'exhibition', 'break', 'logistics'];

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function EventInfoEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['event-info'], queryFn: () => EventInfoEntity.get(), staleTime: 30_000 });
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data && !draft) setDraft(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => EventInfoEntity.update(payload),
    onSuccess: (updated) => {
      qc.setQueryData(['event-info'], updated);
      setDirty(false);
    },
  });

  const { update, add, remove, move } = makeListHelpers(setDraft);
  const markDirty = () => setDirty(true);

  if (isLoading || !draft) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => saveMutation.mutate(draft)} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Event Info
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Dates">
          <Input value={draft.dates} onChange={e => { setDraft(d => ({ ...d, dates: e.target.value })); markDirty(); }} />
        </Field>
        <Field label="Opening Hours">
          <Input value={draft.hours} onChange={e => { setDraft(d => ({ ...d, hours: e.target.value })); markDirty(); }} />
        </Field>
        <Field label="Venue">
          <Input value={draft.venue} onChange={e => { setDraft(d => ({ ...d, venue: e.target.value })); markDirty(); }} />
        </Field>
        <Field label="Entry">
          <Input value={draft.entry} onChange={e => { setDraft(d => ({ ...d, entry: e.target.value })); markDirty(); }} />
        </Field>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">About (paragraphs)</p>
        <div className="space-y-2">
          {draft.aboutParagraphs.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Textarea rows={2} value={p} onChange={e => { update('aboutParagraphs', i, e.target.value); markDirty(); }} />
              <RowActions index={i} total={draft.aboutParagraphs.length} onMove={dir => { move('aboutParagraphs', i, dir); markDirty(); }} onRemove={() => { remove('aboutParagraphs', i); markDirty(); }} />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { add('aboutParagraphs', ''); markDirty(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Paragraph
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Visitor Guidance</p>
        <div className="space-y-2">
          {draft.visitorGuidance.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input value={item.icon} onChange={e => { update('visitorGuidance', i, { ...item, icon: e.target.value }); markDirty(); }} className="w-14 text-center" placeholder="🗺️" />
              <Input value={item.text} onChange={e => { update('visitorGuidance', i, { ...item, text: e.target.value }); markDirty(); }} className="flex-1" />
              <RowActions index={i} total={draft.visitorGuidance.length} onMove={dir => { move('visitorGuidance', i, dir); markDirty(); }} onRemove={() => { remove('visitorGuidance', i); markDirty(); }} />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { add('visitorGuidance', { icon: '📌', text: '' }); markDirty(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Tip
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Exhibitor Tiers</p>
        <div className="space-y-2">
          {draft.exhibitorTiers.map((t, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_2fr_auto] gap-2 items-start">
              <Input value={t.tier} onChange={e => { update('exhibitorTiers', i, { ...t, tier: e.target.value }); markDirty(); }} placeholder="Tier name" />
              <Select value={t.color} onValueChange={v => { update('exhibitorTiers', i, { ...t, color: v }); markDirty(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIER_COLOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={t.desc} onChange={e => { update('exhibitorTiers', i, { ...t, desc: e.target.value }); markDirty(); }} placeholder="Description" />
              <RowActions index={i} total={draft.exhibitorTiers.length} onMove={dir => { move('exhibitorTiers', i, dir); markDirty(); }} onRemove={() => { remove('exhibitorTiers', i); markDirty(); }} />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { add('exhibitorTiers', { tier: '', color: TIER_COLOR_OPTIONS[0].value, desc: '' }); markDirty(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Tier
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Event Rules</p>
        <div className="space-y-2">
          {draft.rules.map((rule, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input value={rule} onChange={e => { update('rules', i, e.target.value); markDirty(); }} className="flex-1" />
              <RowActions index={i} total={draft.rules.length} onMove={dir => { move('rules', i, dir); markDirty(); }} onRemove={() => { remove('rules', i); markDirty(); }} />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { add('rules', ''); markDirty(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Rule
        </Button>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">FAQs</p>
        <div className="space-y-3">
          {draft.faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex gap-2 items-start">
                <Input value={faq.q} onChange={e => { update('faqs', i, { ...faq, q: e.target.value }); markDirty(); }} placeholder="Question" className="flex-1" />
                <RowActions index={i} total={draft.faqs.length} onMove={dir => { move('faqs', i, dir); markDirty(); }} onRemove={() => { remove('faqs', i); markDirty(); }} />
              </div>
              <Textarea rows={2} value={faq.a} onChange={e => { update('faqs', i, { ...faq, a: e.target.value }); markDirty(); }} placeholder="Answer" />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => { add('faqs', { q: '', a: '' }); markDirty(); }}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add FAQ
        </Button>
      </div>
    </div>
  );
}

function SessionRow({ session, index, total, onChange, onRemove, onMove }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Time">
          <Input value={session.time} onChange={e => onChange({ ...session, time: e.target.value })} placeholder="09:00" />
        </Field>
        <Field label="Duration">
          <Input value={session.duration} onChange={e => onChange({ ...session, duration: e.target.value })} placeholder="45 min" />
        </Field>
        <Field label="Type">
          <Select value={session.type} onValueChange={v => onChange({ ...session, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end justify-between">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Online</label>
            <Switch checked={!!session.virtual} onCheckedChange={v => onChange({ ...session, virtual: v })} />
          </div>
          <RowActions index={index} total={total} onMove={onMove} onRemove={onRemove} />
        </div>
      </div>
      <Field label="Title">
        <Input value={session.title} onChange={e => onChange({ ...session, title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Location">
          <Input value={session.location} onChange={e => onChange({ ...session, location: e.target.value })} />
        </Field>
        <Field label="Speaker (optional)">
          <Input value={session.speaker} onChange={e => onChange({ ...session, speaker: e.target.value })} />
        </Field>
      </div>
      {session.virtual && (
        <Field label="Webinar / Stream URL">
          <Input value={session.webinar_url} onChange={e => onChange({ ...session, webinar_url: e.target.value })} placeholder="https://…" />
        </Field>
      )}
    </div>
  );
}

function ScheduleEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['schedule-content'], queryFn: () => ScheduleContent.get(), staleTime: 30_000 });
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [activeDayId, setActiveDayId] = useState(null);

  useEffect(() => {
    if (data && !draft) {
      setDraft(data);
      setActiveDayId(data.days?.[0]?.id || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => ScheduleContent.update(payload),
    onSuccess: (updated) => {
      qc.setQueryData(['schedule-content'], updated);
      setDirty(false);
    },
  });

  if (isLoading || !draft) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>;
  }

  const days = draft.days || [];
  const dayIndex = days.findIndex(d => d.id === activeDayId);
  const day = days[dayIndex];

  const updateDay = (patch) => {
    setDraft(d => ({ ...d, days: d.days.map(x => (x.id === activeDayId ? { ...x, ...patch } : x)) }));
    setDirty(true);
  };
  const addDay = () => {
    const id = newId('day');
    setDraft(d => ({ ...d, days: [...d.days, { id, label: `Day ${d.days.length + 1}`, date: '', theme: '', sessions: [] }] }));
    setActiveDayId(id);
    setDirty(true);
  };
  const removeDay = (id) => {
    setDraft(d => {
      const next = d.days.filter(x => x.id !== id);
      if (activeDayId === id) setActiveDayId(next[0]?.id || null);
      return { ...d, days: next };
    });
    setDirty(true);
  };

  const updateSession = (i, next) => {
    updateDay({ sessions: day.sessions.map((s, idx) => (idx === i ? next : s)) });
  };
  const addSession = () => {
    updateDay({ sessions: [...day.sessions, { id: newId('s'), time: '', title: '', location: '', type: 'session', speaker: '', duration: '', virtual: false, webinar_url: '' }] });
  };
  const removeSession = (i) => {
    updateDay({ sessions: day.sessions.filter((_, idx) => idx !== i) });
  };
  const moveSession = (i, dir) => {
    const arr = [...day.sessions];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateDay({ sessions: arr });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => saveMutation.mutate(draft)} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Schedule
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {days.map(d => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActiveDayId(d.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${activeDayId === d.id ? 'bg-amber text-slate-900 border-amber' : 'bg-muted border-border hover:bg-muted/80'}`}
          >
            {d.label}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={addDay}><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Day</Button>
      </div>

      {day && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Day label">
              <Input value={day.label} onChange={e => updateDay({ label: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input value={day.date} onChange={e => updateDay({ date: e.target.value })} placeholder="4 June 2026" />
            </Field>
            <Field label="Theme">
              <Input value={day.theme} onChange={e => updateDay({ theme: e.target.value })} />
            </Field>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sessions</p>
            <Button variant="destructive" size="sm" onClick={() => removeDay(day.id)}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove This Day
            </Button>
          </div>

          <div className="space-y-2">
            {day.sessions.map((s, i) => (
              <SessionRow
                key={s.id || i}
                session={s}
                index={i}
                total={day.sessions.length}
                onChange={next => updateSession(i, next)}
                onRemove={() => removeSession(i)}
                onMove={dir => moveSession(i, dir)}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addSession}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Session
          </Button>
        </>
      )}
    </div>
  );
}

function VisibilityToggles() {
  const { settings, updateSettings } = useAppSettings();
  const [pending, setPending] = useState(null);

  const toggle = async (key) => {
    setPending(key);
    await updateSettings({ [key]: !settings[key] });
    setPending(null);
  };

  const rows = [
    { key: 'showEventInfo', label: 'Event Info', desc: 'Dates, venue, FAQs and rules page.' },
    { key: 'showSchedule', label: 'Schedule', desc: 'The day-by-day agenda page.' },
    { key: 'showUpdates', label: 'Updates', desc: 'Announcements feed (sponsored + plain updates).' },
  ];

  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.key} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">{row.label}</p>
            <p className="text-xs text-muted-foreground">{row.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            {pending === row.key && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            <Switch checked={settings[row.key] !== false} onCheckedChange={() => toggle(row.key)} disabled={pending === row.key} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventContentManager() {
  const [expanded, setExpanded] = useState('eventinfo');
  const toggle = (id) => setExpanded(e => (e === id ? null : id));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-amber" />
          Event Content
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit the physical show's Event Info and Schedule pages, and turn Event Info, Schedule or Updates on/off
          when they're not relevant (e.g. outside the show season).
        </p>
      </div>

      <Section title="Visibility" icon={<Eye className="w-4 h-4 text-amber" />} expanded={expanded === 'visibility'} onToggle={() => toggle('visibility')}>
        <VisibilityToggles />
      </Section>

      <Section title="Event Info" icon={<InfoIcon className="w-4 h-4 text-amber" />} expanded={expanded === 'eventinfo'} onToggle={() => toggle('eventinfo')}>
        <EventInfoEditor />
      </Section>

      <Section title="Schedule" icon={<CalendarClock className="w-4 h-4 text-amber" />} expanded={expanded === 'schedule'} onToggle={() => toggle('schedule')}>
        <ScheduleEditor />
      </Section>
    </div>
  );
}
