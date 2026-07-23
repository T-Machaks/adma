import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JobListing, TenderListing, Collaboration, AdSlot } from '@/api/entities';
import { CheckCircle, Clock, Briefcase, FileText, Handshake, Loader2, XCircle, Megaphone } from 'lucide-react';

function RequestCard({ icon: Icon, title, subtitle, meta, onActivate, onDecline, busy }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 bg-amber/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {onDecline && (
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex items-center gap-1 text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" /> Decline
          </button>
        )}
        <button
          onClick={onActivate}
          disabled={busy}
          className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Activate
        </button>
      </div>
    </div>
  );
}

export default function PaidListingRequests() {
  const qc = useQueryClient();

  const { data: jobs = [] } = useQuery({ queryKey: ['job-listings'], queryFn: () => JobListing.list('-created_date') });
  const { data: tenders = [] } = useQuery({ queryKey: ['tender-listings'], queryFn: () => TenderListing.list('-created_date') });
  const { data: collabs = [] } = useQuery({ queryKey: ['collaborations'], queryFn: () => Collaboration.list('-created_date') });
  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list('-created_date') });

  const pendingJobs = jobs.filter(j => j.interactive_status === 'requested');
  const pendingTenders = tenders.filter(t => t.interactive_status === 'requested');
  const pendingCollabs = collabs.filter(c => (c.status || 'Pending') === 'Pending');
  const pendingAdSlots = adSlots.filter(a => a.review_status === 'requested');

  const activateJob = useMutation({
    mutationFn: (id) => JobListing.update(id, { interactive_status: 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });
  const declineJob = useMutation({
    mutationFn: (id) => JobListing.update(id, { interactive_status: 'declined' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-listings'] }),
  });
  const activateTender = useMutation({
    mutationFn: (id) => TenderListing.update(id, { interactive_status: 'active' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tender-listings'] }),
  });
  const declineTender = useMutation({
    mutationFn: (id) => TenderListing.update(id, { interactive_status: 'declined' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tender-listings'] }),
  });
  const activateCollab = useMutation({
    mutationFn: (id) => Collaboration.update(id, { status: 'Open' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborations'] }),
  });
  const declineCollab = useMutation({
    mutationFn: (id) => Collaboration.update(id, { status: 'Closed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collaborations'] }),
  });
  const activateAdSlot = useMutation({
    mutationFn: (slot) => AdSlot.update(slot.id, slot.pending_changes
      ? { ...slot.pending_changes, pending_changes: null, review_status: null }
      : { active: true, review_status: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adslots'] }),
  });
  const declineAdSlot = useMutation({
    mutationFn: (id) => AdSlot.update(id, { pending_changes: null, review_status: 'declined' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adslots'] }),
  });

  const totalPending = pendingJobs.length + pendingTenders.length + pendingCollabs.length + pendingAdSlots.length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber" />
          Paid Listing Requests
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Activate paid interactive features and Partner Collaboration listings once payment has been confirmed.</p>
      </div>

      {totalPending === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No paid listing requests pending.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingAdSlots.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Ad Slots — New/Edit Review</p>
              <div className="space-y-2">
                {pendingAdSlots.map(a => (
                  <RequestCard
                    key={a.id}
                    icon={Megaphone}
                    title={a.company}
                    subtitle={a.pending_changes ? (a.pending_changes.headline || a.headline) : a.headline}
                    meta={a.pending_changes ? 'Edit to an existing live ad' : 'New ad slot'}
                    busy={activateAdSlot.isPending || declineAdSlot.isPending}
                    onActivate={() => activateAdSlot.mutate(a)}
                    onDecline={() => declineAdSlot.mutate(a.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pendingCollabs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Partner Collaborations</p>
              <div className="space-y-2">
                {pendingCollabs.map(c => (
                  <RequestCard
                    key={c.id}
                    icon={Handshake}
                    title={c.title}
                    subtitle={c.company_name}
                    meta={c.type}
                    busy={activateCollab.isPending || declineCollab.isPending}
                    onActivate={() => activateCollab.mutate(c.id)}
                    onDecline={() => declineCollab.mutate(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pendingJobs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Job Listings — CV Applications</p>
              <div className="space-y-2">
                {pendingJobs.map(j => (
                  <RequestCard
                    key={j.id}
                    icon={Briefcase}
                    title={j.title}
                    subtitle={j.company_name}
                    busy={activateJob.isPending || declineJob.isPending}
                    onActivate={() => activateJob.mutate(j.id)}
                    onDecline={() => declineJob.mutate(j.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pendingTenders.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Tender Listings — Document Attachment</p>
              <div className="space-y-2">
                {pendingTenders.map(t => (
                  <RequestCard
                    key={t.id}
                    icon={FileText}
                    title={t.title}
                    subtitle={t.company_name}
                    busy={activateTender.isPending || declineTender.isPending}
                    onActivate={() => activateTender.mutate(t.id)}
                    onDecline={() => declineTender.mutate(t.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
