import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JobListing, TenderListing } from '@/api/entities';
import {
  Briefcase, FileText, Plus, Edit2, Trash2, MapPin, Clock, ExternalLink, Download, UploadCloud,
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
import { EVENT_CONFIG } from '@/lib/eventConfig';
import { JOB_CATEGORIES, JOB_TYPES } from '@/lib/jobConstants';
import ImageUploadOrUrlField from '@/components/shared/ImageUploadOrUrlField';

const TENDER_CATEGORIES = EVENT_CONFIG.exhibitorCategories;

const EMPTY_JOB = {
  title: '', company_name: '', category: JOB_CATEGORIES[0], location: '', type: JOB_TYPES[0],
  description: '', requirements: '', closing_date: '', source_url: '', status: 'Open',
  display_format: 'text', display_image_url: '',
};
const EMPTY_TENDER = {
  title: '', company_name: '', category: TENDER_CATEGORIES[0], description: '', closing_date: '',
  source_url: '', status: 'Open', display_format: 'text', display_image_url: '', document_url: '',
};

export default function MarketplaceListings() {
  const qc = useQueryClient();

  const { data: allJobs = [] } = useQuery({ queryKey: ['job-listings'], queryFn: () => JobListing.list('-created_date') });
  const { data: allTenders = [] } = useQuery({ queryKey: ['tender-listings'], queryFn: () => TenderListing.list('-created_date') });

  const jobs = allJobs.filter(j => !j.exhibitor_id);
  const tenders = allTenders.filter(t => !t.exhibitor_id);

  // Job dialog state
  const [jobDialog, setJobDialog] = useState(false);
  const [editJobId, setEditJobId] = useState(null);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [deleteJobId, setDeleteJobId] = useState(null);

  // Tender dialog state
  const [tenderDialog, setTenderDialog] = useState(false);
  const [editTenderId, setEditTenderId] = useState(null);
  const [tenderForm, setTenderForm] = useState(EMPTY_TENDER);
  const [deleteTenderId, setDeleteTenderId] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const saveJob = useMutation({
    mutationFn: (data) => editJobId ? JobListing.update(editJobId, data) : JobListing.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-listings'] }); setJobDialog(false); },
  });
  const deleteJob = useMutation({
    mutationFn: (id) => JobListing.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['job-listings'] }); setDeleteJobId(null); },
  });

  const saveTender = useMutation({
    mutationFn: (data) => editTenderId ? TenderListing.update(editTenderId, data) : TenderListing.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tender-listings'] }); setTenderDialog(false); },
  });
  const deleteTender = useMutation({
    mutationFn: (id) => TenderListing.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tender-listings'] }); setDeleteTenderId(null); },
  });

  const openCreateJob = () => { setEditJobId(null); setJobForm(EMPTY_JOB); setJobDialog(true); };
  const openEditJob = (j) => {
    setEditJobId(j.id);
    setJobForm({
      title: j.title || '', company_name: j.company_name || '', category: j.category || JOB_CATEGORIES[0],
      location: j.location || '', type: j.type || JOB_TYPES[0], description: j.description || '',
      requirements: j.requirements || '', closing_date: j.closing_date || '', source_url: j.source_url || '',
      status: j.status || 'Open', display_format: j.display_format || 'text', display_image_url: j.display_image_url || '',
    });
    setJobDialog(true);
  };
  const handleJobSubmit = (e) => {
    e.preventDefault();
    if (!jobForm.title.trim() || !jobForm.company_name.trim()) return;
    saveJob.mutate(jobForm);
  };

  const openCreateTender = () => { setEditTenderId(null); setTenderForm(EMPTY_TENDER); setTenderDialog(true); };
  const openEditTender = (t) => {
    setEditTenderId(t.id);
    setTenderForm({
      title: t.title || '', company_name: t.company_name || '', category: t.category || TENDER_CATEGORIES[0],
      description: t.description || '', closing_date: t.closing_date || '', source_url: t.source_url || '',
      status: t.status || 'Open', display_format: t.display_format || 'text', display_image_url: t.display_image_url || '',
      document_url: t.document_url || '',
    });
    setTenderDialog(true);
  };
  const handleTenderSubmit = (e) => {
    e.preventDefault();
    if (!tenderForm.title.trim() || !tenderForm.company_name.trim()) return;
    saveTender.mutate(tenderForm);
  };

  const handleDocUpload = async (file) => {
    if (!file || !editTenderId) return;
    setUploadingDoc(true);
    try {
      const { uploadUrl, publicUrl } = await TenderListing.getDocumentUploadUrl(editTenderId, tenderForm.document_url || null);
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      setTenderForm(f => ({ ...f, document_url: publicUrl }));
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Marketplace Listings</h1>
        <p className="text-muted-foreground text-sm mt-0.5 max-w-2xl">
          Post job openings and tenders sourced from public platforms that aren't tied to a specific exhibitor's booth.
          Listings posted by exhibitors themselves are managed from their own portal — this page is for generic,
          organizer-posted content only.
        </p>
      </div>

      {/* Jobs section */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Briefcase className="w-5 h-5 text-amber" /> Job Listings</h2>
          <Button onClick={openCreateJob} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Job</Button>
        </div>
        {jobs.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No generic job listings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(j => (
              <div key={j.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{j.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${j.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{j.status || 'Open'}</span>
                  </div>
                  <p className="text-xs text-amber font-medium mt-0.5">{j.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {j.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {j.location}</span>}
                    {j.type && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {j.type}</span>}
                    {j.closing_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {j.closing_date}</span>}
                    {j.source_url && (
                      <a href={j.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber">
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditJob(j)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteJobId(j.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenders section */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-amber" /> Tenders</h2>
          <Button onClick={openCreateTender} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Tender</Button>
        </div>
        {tenders.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No generic tender listings yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tenders.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{t.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'Awarded' ? 'bg-blue-100 text-blue-700' : t.status === 'Closed' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                    }`}>{t.status || 'Open'}</span>
                  </div>
                  <p className="text-xs text-amber font-medium mt-0.5">{t.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {t.category && <span className="bg-muted px-2 py-0.5 rounded font-medium">{t.category}</span>}
                    {t.closing_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {t.closing_date}</span>}
                    {t.document_url && (
                      <a href={t.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber">
                        <Download className="w-3 h-3" /> Document
                      </a>
                    )}
                    {t.source_url && (
                      <a href={t.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber">
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditTender(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteTenderId(t.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job dialog */}
      <Dialog open={jobDialog} onOpenChange={setJobDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editJobId ? 'Edit Job Listing' : 'New Job Listing'}</DialogTitle></DialogHeader>
          <form onSubmit={handleJobSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Job Title *</label>
              <Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Company / Organization *</label>
              <Input value={jobForm.company_name} onChange={e => setJobForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. Ministry of Agriculture" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Category</label>
                <Select value={jobForm.category} onValueChange={v => setJobForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Type</label>
                <Select value={jobForm.type} onValueChange={v => setJobForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Location</label>
                <Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Harare" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Closing Date</label>
                <Input type="date" value={jobForm.closing_date} onChange={e => setJobForm(f => ({ ...f, closing_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Textarea rows={3} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Requirements</label>
              <Textarea rows={3} value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Original Posting Link (optional)</label>
              <Input value={jobForm.source_url} onChange={e => setJobForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
                <Select value={jobForm.status} onValueChange={v => setJobForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Display Format</label>
                <Select value={jobForm.display_format} onValueChange={v => setJobForm(f => ({ ...f, display_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (standard row)</SelectItem>
                    <SelectItem value="image_tile">Image Tile</SelectItem>
                    <SelectItem value="featured_banner">Featured Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(jobForm.display_format === 'image_tile' || jobForm.display_format === 'featured_banner') && (
              <ImageUploadOrUrlField
                label="Listing Image"
                value={jobForm.display_image_url}
                onChange={v => setJobForm(f => ({ ...f, display_image_url: v }))}
                ownerId={editJobId || 'generic-job'}
                purpose="job"
                preset="banner"
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setJobDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saveJob.isPending}>{saveJob.isPending ? 'Saving…' : editJobId ? 'Save Changes' : 'Create Listing'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tender dialog */}
      <Dialog open={tenderDialog} onOpenChange={setTenderDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTenderId ? 'Edit Tender' : 'New Tender'}</DialogTitle></DialogHeader>
          <form onSubmit={handleTenderSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title *</label>
              <Input value={tenderForm.title} onChange={e => setTenderForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Company / Organization *</label>
              <Input value={tenderForm.company_name} onChange={e => setTenderForm(f => ({ ...f, company_name: e.target.value }))} placeholder="e.g. ZimTenders / Government of Zimbabwe" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Category</label>
                <Select value={tenderForm.category} onValueChange={v => setTenderForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TENDER_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Closing Date</label>
                <Input type="date" value={tenderForm.closing_date} onChange={e => setTenderForm(f => ({ ...f, closing_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Scope of Work</label>
              <Textarea rows={4} value={tenderForm.description} onChange={e => setTenderForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Original Posting Link (optional)</label>
              <Input value={tenderForm.source_url} onChange={e => setTenderForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Tender Document (PDF, optional)</label>
              {!editTenderId ? (
                <p className="text-xs text-muted-foreground">Save the tender first, then reopen it to attach a document.</p>
              ) : tenderForm.document_url ? (
                <a href={tenderForm.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-lg font-medium hover:bg-muted transition-colors w-fit">
                  <Download className="w-3.5 h-3.5" /> View current document
                </a>
              ) : (
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm cursor-pointer hover:bg-muted transition-colors w-fit ${uploadingDoc ? 'opacity-60 pointer-events-none' : ''}`}>
                  <UploadCloud className="w-4 h-4 text-muted-foreground" />
                  {uploadingDoc ? 'Uploading…' : 'Upload PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => handleDocUpload(e.target.files?.[0])} disabled={uploadingDoc} />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
                <Select value={tenderForm.status} onValueChange={v => setTenderForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Awarded">Awarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Display Format</label>
                <Select value={tenderForm.display_format} onValueChange={v => setTenderForm(f => ({ ...f, display_format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text (standard row)</SelectItem>
                    <SelectItem value="image_tile">Image Tile</SelectItem>
                    <SelectItem value="featured_banner">Featured Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(tenderForm.display_format === 'image_tile' || tenderForm.display_format === 'featured_banner') && (
              <ImageUploadOrUrlField
                label="Listing Image"
                value={tenderForm.display_image_url}
                onChange={v => setTenderForm(f => ({ ...f, display_image_url: v }))}
                ownerId={editTenderId || 'generic-tender'}
                purpose="tender"
                preset="banner"
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTenderDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saveTender.isPending}>{saveTender.isPending ? 'Saving…' : editTenderId ? 'Save Changes' : 'Create Tender'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirms */}
      <Dialog open={!!deleteJobId} onOpenChange={open => !open && setDeleteJobId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Job Listing</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This job listing will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteJobId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteJob.isPending} onClick={() => deleteJob.mutate(deleteJobId)}>{deleteJob.isPending ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteTenderId} onOpenChange={open => !open && setDeleteTenderId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Tender</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This tender will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteTenderId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteTender.isPending} onClick={() => deleteTender.mutate(deleteTenderId)}>{deleteTender.isPending ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
