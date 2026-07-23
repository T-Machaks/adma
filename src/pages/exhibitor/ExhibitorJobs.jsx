import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, JobListing, JobApplication } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { standTierAtLeast } from '@/lib/standTiers';
import { JOB_CATEGORIES, JOB_TYPES } from '@/lib/jobConstants';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';
import {
  Briefcase, Plus, X, Lock, ArrowRight, Trash2, Edit, Users, MapPin, Clock, Mail, Phone, FileUp,
} from 'lucide-react';

const EMPTY_JOB = { title: '', category: JOB_CATEGORIES[0], location: '', type: JOB_TYPES[0], description: '', requirements: '', closing_date: '' };

export default function ExhibitorJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_JOB);
  const [expandedJob, setExpandedJob] = useState(null);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  const { data: allJobs = [] } = useQuery({
    queryKey: ['job-listings'],
    queryFn: () => JobListing.list('-created_date'),
    enabled: !!myBooth,
  });

  const myJobs = allJobs.filter(j => j.exhibitor_id === myBooth?.id);

  const { data: applications = [] } = useQuery({
    queryKey: ['job-applications', expandedJob],
    queryFn: () => JobApplication.filterByJob(expandedJob),
    enabled: !!expandedJob,
  });

  const createMutation = useMutation({
    mutationFn: (data) => JobListing.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-listings'] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => JobListing.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-listings'] }); closeForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => JobListing.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });
  const requestPaymentMutation = useMutation({
    mutationFn: (id) => JobListing.requestPayment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_JOB); };

  const openCreate = () => { setForm(EMPTY_JOB); setEditingId(null); setFormOpen(true); };
  const openEdit = (job) => {
    setForm({
      title: job.title || '', category: job.category || JOB_CATEGORIES[0], location: job.location || '',
      type: job.type || JOB_TYPES[0], description: job.description || '', requirements: job.requirements || '',
      closing_date: job.closing_date || '',
    });
    setEditingId(job.id);
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = { ...form, exhibitor_id: myBooth.id, company_name: myBooth.name };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const toggleStatus = (job) => {
    updateMutation.mutate({ id: job.id, data: { status: job.status === 'Open' ? 'Closed' : 'Open' } });
  };

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">No booth linked to your account.</p>
      </div>
    );
  }

  if (!standTierAtLeast(myBooth, 'Enhanced')) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-14 h-14 bg-amber/10 border border-amber/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-amber" />
        </div>
        <h1 className="font-heading text-xl font-bold mb-2">Job postings are an Enhanced package feature</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          You're currently on the <strong>Basic</strong> package. Upgrade to Enhanced or above to post job openings to attendees.
        </p>
        <a
          href={`mailto:${EVENT_CONFIG.contactEmail}?subject=Booth%20Upgrade%20Enquiry`}
          className="inline-flex items-center gap-1.5 text-sm bg-amber text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150"
        >
          Enquire to Upgrade <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber" /> Job Postings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Roles you've posted to the {EVENT_CONFIG.eventName} jobs board</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Post a Job
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingId ? 'Edit Job' : 'New Job Posting'}</p>
            <button type="button" onClick={closeForm} className="p-1 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Job Title</label>
            <input
              type="text" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50">
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50">
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Location</label>
              <input
                type="text" value={form.location} placeholder="e.g. Harare"
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1">Closing Date</label>
              <input
                type="date" value={form.closing_date}
                onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Description</label>
            <textarea
              rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Requirements</label>
            <textarea
              rows={3} value={form.requirements}
              onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-amber text-white rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
            >
              {editingId ? 'Save Changes' : 'Post Job'}
            </button>
            <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted active:scale-95 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {myJobs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No job postings yet</p>
          <p className="text-xs text-muted-foreground mt-1">Post a role to reach attendees browsing the jobs board.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myJobs.map(job => {
            const isExpanded = expandedJob === job.id;
            return (
              <div key={job.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{job.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${job.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {job.status || 'Open'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                        {job.type && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {job.type}</span>}
                        {job.closing_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {job.closing_date}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEdit(job)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(job.id)} className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => toggleStatus(job)}
                      className="text-xs border border-border px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors"
                    >
                      Mark as {job.status === 'Open' ? 'Closed' : 'Open'}
                    </button>
                    <button
                      onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                      className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:underline"
                    >
                      <Users className="w-3.5 h-3.5" /> {isExpanded ? 'Hide' : 'View'} Applicants
                    </button>
                    {job.interactive_status === 'active' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 ml-auto">
                        <FileUp className="w-3 h-3" /> Premium features active
                      </span>
                    ) : job.interactive_status === 'requested' ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 ml-auto">
                        Awaiting activation
                      </span>
                    ) : (
                      <button
                        onClick={() => requestPaymentMutation.mutate(job.id)}
                        disabled={requestPaymentMutation.isPending}
                        className="flex items-center gap-1.5 text-xs border border-amber/40 text-amber px-3 py-1.5 rounded-lg font-medium hover:bg-amber/10 transition-colors ml-auto disabled:opacity-60"
                      >
                        <FileUp className="w-3.5 h-3.5" /> Enable Premium Features (Paid)
                      </button>
                    )}
                  </div>

                  {job.interactive_status === 'active' && (
                    <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Listing Display Format</label>
                      <select
                        value={job.display_format || 'text'}
                        onChange={e => updateMutation.mutate({ id: job.id, data: { display_format: e.target.value } })}
                        className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background"
                      >
                        <option value="text">Text (standard row)</option>
                        <option value="image_tile">Image Tile</option>
                        <option value="featured_banner">Featured Banner (pinned to top)</option>
                      </select>
                      {(job.display_format === 'image_tile' || job.display_format === 'featured_banner') && (
                        <ImageUploadOrUrlField
                          label="Listing Image"
                          value={job.display_image_url}
                          onChange={v => updateMutation.mutate({ id: job.id, data: { display_image_url: v } })}
                          ownerId={job.id}
                          purpose="job"
                          preset="banner"
                        />
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    {applications.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No applications yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {applications.map(a => (
                          <div key={a.id} className="bg-card border border-border rounded-lg p-3">
                            <p className="text-sm font-semibold">{a.name}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                              <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> {a.email}</a>
                              {a.phone && <a href={`tel:${a.phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> {a.phone}</a>}
                              {a.cv_url && <a href={a.cv_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber"><FileUp className="w-3 h-3" /> CV</a>}
                            </div>
                            {a.message && <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{a.message}</p>}
                          </div>
                        ))}
                      </div>
                    )}
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
