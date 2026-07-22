import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Collaboration, VirtualEnquiry } from '@/api/entities';
import { notifyEnquiry } from '@/api/notify';
import { useAuth } from '@/lib/AuthContext';
import {
  ArrowLeft, Clock, Send, CheckCircle, Lock, LogIn, UserPlus,
} from 'lucide-react';

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CollaborationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data: collab, isLoading } = useQuery({
    queryKey: ['collaboration', id],
    queryFn: () => Collaboration.get(id),
  });

  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, name: user.full_name || f.name, email: user.email || f.email, company: user.company || f.company }));
    }
  }, [user]);

  const interestMutation = useMutation({
    mutationFn: (data) => VirtualEnquiry.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-enquiries'] });
      notifyEnquiry(variables);
      setSubmitted(true);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    interestMutation.mutate({
      exhibitor_id: collab.exhibitor_id,
      exhibitor_name: collab.company_name,
      collaboration_id: collab.id,
      collaboration_title: collab.title,
      message: `[Collaboration: ${collab.title}] ${form.message}`.trim(),
      name: form.name, email: form.email, company: form.company, phone: form.phone,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!collab) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">Collaboration not found.</p>
        <button onClick={() => navigate('/collaborations')} className="mt-3 text-amber text-sm underline">Back to collaborations</button>
      </div>
    );
  }

  const isClosed = (collab.status || 'Pending') !== 'Open';

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to collaborations
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="font-heading text-xl font-bold leading-tight">{collab.title}</h1>
              <p className="text-sm text-amber font-medium mt-1">{collab.company_name}</p>
            </div>
            {isClosed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex-shrink-0">Closed</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {collab.type && <span className="bg-muted px-2 py-0.5 rounded font-medium">{collab.type}</span>}
            {collab.closing_date && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Closes {fmtDate(collab.closing_date)}</span>}
          </div>
        </div>

        {collab.description && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-2">Opportunity Details</h2>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{collab.description}</p>
          </div>
        )}

        {isClosed ? (
          <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center text-sm text-muted-foreground">
            This opportunity is no longer accepting expressions of interest.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Send className="w-4 h-4 text-amber" />
              <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Express Interest</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Sent directly to {collab.company_name} — they'll follow up with next steps.</p>

            {!isAuthenticated ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Lock className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sign in to express interest.</p>
                <div className="flex gap-2">
                  <Link to="/login" className="flex items-center gap-1.5 bg-amber text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    <LogIn className="w-3.5 h-3.5" /> Sign In
                  </Link>
                  <Link to="/register" className="flex items-center gap-1.5 border border-border text-xs font-semibold px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Create Account
                  </Link>
                </div>
              </div>
            ) : submitted ? (
              <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Interest sent!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{collab.company_name} will be in touch with next steps.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Name</label>
                    <input
                      type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
                    <input
                      type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Company</label>
                    <input
                      type="text" value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Phone (optional)</label>
                    <input
                      type="tel" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+263 7X XXX XXXX"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Message</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Briefly describe your interest in this opportunity…"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
                  />
                </div>
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <button
                  type="submit"
                  disabled={interestMutation.isPending}
                  className="w-full bg-amber text-white font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {interestMutation.isPending ? 'Sending…' : 'Express Interest'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
