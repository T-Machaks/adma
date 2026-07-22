import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Exhibitor, TenderListing, VirtualEnquiry } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { standTierAtLeast } from '@/lib/standTiers';
import {
  FileText, Plus, X, Lock, ArrowRight, Trash2, Edit, Users, Clock, Mail, Phone,
  Building2, Download, UploadCloud,
} from 'lucide-react';

const CATEGORIES = EVENT_CONFIG.exhibitorCategories;
const EMPTY_TENDER = { title: '', category: CATEGORIES[0], description: '', closing_date: '' };

export default function ExhibitorTenders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_TENDER);
  const [expandedTender, setExpandedTender] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  const { data: allTenders = [] } = useQuery({
    queryKey: ['tender-listings'],
    queryFn: () => TenderListing.list('-created_date'),
    enabled: !!myBooth,
  });

  const myTenders = allTenders.filter(t => t.exhibitor_id === myBooth?.id);

  const { data: allEnquiries = [] } = useQuery({
    queryKey: ['virtual-enquiries'],
    queryFn: () => VirtualEnquiry.list('-created_date'),
    enabled: !!expandedTender,
  });

  const interests = allEnquiries.filter(e => e.tender_id === expandedTender);

  const createMutation = useMutation({
    mutationFn: (data) => TenderListing.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tender-listings'] }); closeForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => TenderListing.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tender-listings'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => TenderListing.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tender-listings'] }),
  });

  const closeForm = () => { setFormOpen(false); setEditingId(null); setForm(EMPTY_TENDER); };
  const openCreate = () => { setForm(EMPTY_TENDER); setEditingId(null); setFormOpen(true); };
  const openEdit = (t) => {
    setForm({ title: t.title || '', category: t.category || CATEGORIES[0], description: t.description || '', closing_date: t.closing_date || '' });
    setEditingId(t.id);
    setFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = { ...form, exhibitor_id: myBooth.id, company_name: myBooth.name };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload }, { onSuccess: closeForm });
    else createMutation.mutate(payload);
  };

  const toggleStatus = (t, status) => updateMutation.mutate({ id: t.id, data: { status } });

  const handleDocUpload = async (tender, file) => {
    if (!file) return;
    setUploadingDoc(tender.id);
    try {
      const { uploadUrl, publicUrl } = await TenderListing.getDocumentUploadUrl(myBooth.id, tender.document_url || null);
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      await updateMutation.mutateAsync({ id: tender.id, data: { document_url: publicUrl } });
    } finally {
      setUploadingDoc(null);
    }
  };

  if (!myBooth) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
        <h1 className="font-heading text-xl font-bold mb-2">Tender postings are an Enhanced package feature</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          You're currently on the <strong>Basic</strong> package. Upgrade to Enhanced or above to post tenders to attendees.
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
            <FileText className="w-5 h-5 text-amber" /> Tenders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Procurement opportunities you've posted to attendees</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs bg-amber text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-amber/90 active:scale-95 transition-all duration-150 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Post a Tender
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingId ? 'Edit Tender' : 'New Tender'}</p>
            <button type="button" onClick={closeForm} className="p-1 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Title</label>
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
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
            <label className="text-xs text-muted-foreground font-medium block mb-1">Scope of Work</label>
            <textarea
              rows={4} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-amber/50 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-semibold bg-amber text-white rounded-lg hover:bg-amber/90 active:scale-95 transition-all disabled:opacity-60"
            >
              {editingId ? 'Save Changes' : 'Post Tender'}
            </button>
            <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-semibold border border-border rounded-lg hover:bg-muted active:scale-95 transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {myTenders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No tenders posted yet</p>
          <p className="text-xs text-muted-foreground mt-1">Post a procurement opportunity to reach attendees.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myTenders.map(t => {
            const isExpanded = expandedTender === t.id;
            return (
              <div key={t.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{t.title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'Awarded' ? 'bg-blue-100 text-blue-700' : t.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {t.status || 'Open'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {t.category && <span className="bg-muted px-2 py-0.5 rounded font-medium">{t.category}</span>}
                        {t.closing_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {t.closing_date}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors" title="Edit">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(t.id)} className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {t.document_url ? (
                      <a href={t.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors">
                        <Download className="w-3.5 h-3.5" /> Document
                      </a>
                    ) : (
                      <label className={`flex items-center gap-1.5 text-xs border border-dashed border-border px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors cursor-pointer ${uploadingDoc === t.id ? 'opacity-60 pointer-events-none' : ''}`}>
                        <UploadCloud className="w-3.5 h-3.5" /> {uploadingDoc === t.id ? 'Uploading…' : 'Upload Document (PDF)'}
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => handleDocUpload(t, e.target.files?.[0])} disabled={uploadingDoc === t.id} />
                      </label>
                    )}
                    <div className="flex gap-1.5">
                      {['Open', 'Closed', 'Awarded'].filter(s => s !== (t.status || 'Open')).map(s => (
                        <button key={s} onClick={() => toggleStatus(t, s)} className="text-xs border border-border px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors">
                          Mark {s}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setExpandedTender(isExpanded ? null : t.id)}
                      className="flex items-center gap-1.5 text-xs text-amber font-semibold hover:underline ml-auto"
                    >
                      <Users className="w-3.5 h-3.5" /> {isExpanded ? 'Hide' : 'View'} Interest
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-3">
                    {interests.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No expressions of interest yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {interests.map(i => (
                          <div key={i.id} className="bg-card border border-border rounded-lg p-3">
                            <p className="text-sm font-semibold">{i.name}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                              <a href={`mailto:${i.email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> {i.email}</a>
                              {i.phone && <a href={`tel:${i.phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> {i.phone}</a>}
                              {i.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {i.company}</span>}
                            </div>
                            {i.message && <p className="text-xs text-foreground/80 mt-2 leading-relaxed">{i.message}</p>}
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
