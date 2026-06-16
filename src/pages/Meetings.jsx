import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingRequest, Exhibitor } from '@/api/entities';
import { Calendar, Clock, CheckCircle, Building2, User, Mail, Phone, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const DATES = ['2 October 2026', '3 October 2026', '4 October 2026'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const empty = { visitor_name: '', visitor_company: '', visitor_email: '', visitor_phone: '', exhibitor_name: '', exhibitor_booth: '', preferred_date: '', preferred_time: '', reason: '' };

export default function Meetings() {
  const location = useLocation();
  const prefill = location.state?.exhibitor;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    ...empty,
    exhibitor_name: prefill?.name || '',
    exhibitor_booth: prefill?.booth || '',
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => MeetingRequest.list('-created_date'),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const mutation = useMutation({
    mutationFn: (data) => MeetingRequest.create({ ...data, status: 'Pending' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setSubmitted(true);
    },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleExhibitorChange = (name) => {
    const ex = exhibitors.find(e => e.name === name);
    set('exhibitor_name', name);
    if (ex) set('exhibitor_booth', ex.booth || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const statusColor = { Pending: 'bg-amber-100 text-amber-700', Confirmed: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700' };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2">Meeting Requested!</h2>
        <p className="text-muted-foreground text-sm mb-1">Your request to meet <strong>{form.exhibitor_name}</strong> has been submitted.</p>
        <p className="text-muted-foreground text-sm mb-6">{form.preferred_date} at {form.preferred_time}</p>
        <button
          onClick={() => { setForm(empty); setSubmitted(false); }}
          className="bg-amber text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-dark transition-colors"
        >
          Book Another Meeting
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Book a Meeting</h1>
      <p className="text-muted-foreground text-sm mb-5">Request a one-on-one meeting with an exhibitor at MineCon 2026.</p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-xl p-5">
        {/* Visitor info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Your Details</p>
          <div className="grid grid-cols-1 gap-3">
            <FormField icon={User} placeholder="Full name *" value={form.visitor_name} onChange={v => set('visitor_name', v)} required />
            <FormField icon={Building2} placeholder="Company name" value={form.visitor_company} onChange={v => set('visitor_company', v)} />
            <FormField icon={Mail} placeholder="Email address *" type="email" value={form.visitor_email} onChange={v => set('visitor_email', v)} required />
            <FormField icon={Phone} placeholder="Phone number" type="tel" value={form.visitor_phone} onChange={v => set('visitor_phone', v)} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Exhibitor */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Exhibitor</p>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
              value={form.exhibitor_name}
              onChange={e => handleExhibitorChange(e.target.value)}
              required
            >
              <option value="">Select exhibitor *</option>
              {exhibitors.map(ex => (
                <option key={ex.id} value={ex.name}>{ex.name} — Booth {ex.booth}</option>
              ))}
            </select>
          </div>
          {form.exhibitor_booth && (
            <p className="text-xs text-muted-foreground mt-1 pl-1">📍 Booth: {form.exhibitor_booth}</p>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Date & time */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Preferred Slot</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
                value={form.preferred_date} onChange={e => set('preferred_date', e.target.value)} required>
                <option value="">Date *</option>
                {DATES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber appearance-none"
                value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} required>
                <option value="">Time *</option>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <textarea
            placeholder="Reason for meeting / what to discuss"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            rows={3}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-amber hover:opacity-90 text-white font-semibold py-3 rounded-xl text-sm transition-opacity disabled:opacity-60"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit Meeting Request'}
        </button>
      </form>

      {/* Existing meetings */}
      {meetings.length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide mb-3">Meeting Requests</h2>
          <div className="space-y-3">
            {meetings.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{m.visitor_name} → {m.exhibitor_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Booth {m.exhibitor_booth} · {m.preferred_date} at {m.preferred_time}</p>
                    {m.reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.reason}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[m.status] || statusColor.Pending}`}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ icon: Icon, placeholder, value, onChange, type = 'text', required }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
      />
    </div>
  );
}
