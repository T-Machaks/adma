import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Exhibitor, JobListing, TenderListing, Collaboration, AdSlot } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import { Briefcase, FileText, Handshake, Megaphone, ArrowRight, LayoutList } from 'lucide-react';

const STATUS_BADGE = {
  Open: 'bg-emerald-100 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-500',
  Pending: 'bg-amber-100 text-amber-700',
  requested: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-700',
};

function ListingRow({ title, subtitle, badge, badgeLabel }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[badge] || 'bg-slate-100 text-slate-500'}`}>
        {badgeLabel}
      </span>
    </div>
  );
}

function Section({ icon: Icon, title, count, linkTo, linkLabel, children, empty }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-amber" />
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide">{title}{count != null ? ` (${count})` : ''}</h2>
        </div>
        <Link to={linkTo} className="flex items-center gap-1 text-xs text-amber font-semibold hover:underline flex-shrink-0">
          {linkLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground px-5 py-6 text-center">{empty}</p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

export default function ExhibitorListings() {
  const { user } = useAuth();

  const { data: exhibitors = [] } = useQuery({
    queryKey: ['exhibitors-all'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const myBooth = exhibitors.find(
    e => e.contact_email?.toLowerCase() === user?.email?.toLowerCase()
      || (user?.company && e.name?.toLowerCase() === user.company.toLowerCase())
  ) ?? exhibitors[0];

  const { data: jobs = [] } = useQuery({ queryKey: ['job-listings'], queryFn: () => JobListing.list('-created_date'), enabled: !!myBooth });
  const { data: tenders = [] } = useQuery({ queryKey: ['tender-listings'], queryFn: () => TenderListing.list('-created_date'), enabled: !!myBooth });
  const { data: collabs = [] } = useQuery({ queryKey: ['collaborations'], queryFn: () => Collaboration.list('-created_date'), enabled: !!myBooth });
  const { data: adSlots = [] } = useQuery({ queryKey: ['adslots'], queryFn: () => AdSlot.list(), enabled: !!myBooth });

  const myJobs = jobs.filter(j => j.exhibitor_id === myBooth?.id);
  const myTenders = tenders.filter(t => t.exhibitor_id === myBooth?.id);
  const myCollabs = collabs.filter(c => c.exhibitor_id === myBooth?.id);
  const myAd = myBooth ? (adSlots.find(a => a.exhibitor_id === myBooth.id) ?? null) : null;

  if (!myBooth) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <LayoutList className="w-6 h-6 text-amber" /> My Listings
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Everything you've posted, and its current status, in one place.</p>
      </div>

      <Section icon={Megaphone} title="Ad Banner" count={myAd ? 1 : 0} linkTo="/exhibitor" linkLabel="Manage" empty="No ad slot yet — create one from My Booth.">
        {myAd && (
          <ListingRow
            title={myAd.company}
            subtitle={myAd.pending_changes ? 'Edit pending review' : myAd.headline}
            badge={myAd.review_status === 'requested' ? 'requested' : myAd.active === false ? 'declined' : 'active'}
            badgeLabel={myAd.review_status === 'requested' ? 'Pending Review' : myAd.active === false ? 'Inactive' : 'Live'}
          />
        )}
      </Section>

      <Section icon={Briefcase} title="Jobs" count={myJobs.length} linkTo="/exhibitor/jobs" linkLabel="Manage" empty="No job listings posted yet.">
        {myJobs.map(j => (
          <ListingRow
            key={j.id}
            title={j.title}
            subtitle={
              j.interactive_status === 'active' ? 'CV applications enabled'
                : j.interactive_status === 'requested' ? 'CV upload pending review'
                  : null
            }
            badge={j.status}
            badgeLabel={j.status}
          />
        ))}
      </Section>

      <Section icon={FileText} title="Tenders" count={myTenders.length} linkTo="/exhibitor/tenders" linkLabel="Manage" empty="No tender listings posted yet.">
        {myTenders.map(t => (
          <ListingRow
            key={t.id}
            title={t.title}
            subtitle={
              t.interactive_status === 'active' ? 'Document attachment enabled'
                : t.interactive_status === 'requested' ? 'Document attachment pending review'
                  : null
            }
            badge={t.status}
            badgeLabel={t.status}
          />
        ))}
      </Section>

      <Section icon={Handshake} title="Collaborations" count={myCollabs.length} linkTo="/exhibitor/collaborations" linkLabel="Manage" empty="No collaborations posted yet.">
        {myCollabs.map(c => (
          <ListingRow
            key={c.id}
            title={c.title}
            subtitle={c.type}
            badge={c.status || 'Pending'}
            badgeLabel={c.status || 'Pending'}
          />
        ))}
      </Section>
    </div>
  );
}
