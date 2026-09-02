import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { JobListing, TenderListing, Auction, Collaboration } from '@/api/entities';
import { Briefcase, FileText, Gavel, Handshake, DollarSign, ChevronRight } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';

// Live counts give each card a freshness signal ("12 open now") instead of a static
// label — cheap to fetch (same list queries the destination pages already run) and
// makes the hub feel like an active marketplace, not just a menu.
export default function Marketplace() {
  useSEO({
    title: 'Marketplace',
    description: 'Jobs, tenders, auctions, and collaboration opportunities across the ADMA Agri Show exhibitor network.',
    path: '/marketplace',
  });
  const { data: jobs = [] } = useQuery({ queryKey: ['job-listings'], queryFn: () => JobListing.list() });
  const { data: tenders = [] } = useQuery({ queryKey: ['tender-listings'], queryFn: () => TenderListing.list() });
  const { data: auctions = [] } = useQuery({ queryKey: ['auctions'], queryFn: () => Auction.list() });
  const { data: collaborations = [] } = useQuery({ queryKey: ['collaborations'], queryFn: () => Collaboration.list() });

  const cards = [
    {
      to: '/jobs', icon: Briefcase, label: 'Jobs Board',
      description: 'Roles posted by exhibitors — machinery, agronomy, sales, and more.',
      count: jobs.filter(j => (j.status || 'Open') === 'Open').length, countLabel: 'open',
    },
    {
      to: '/tenders', icon: FileText, label: 'Tenders',
      description: 'Supply and service tenders from exhibitors and the show organisers.',
      count: tenders.filter(t => (t.status || 'Open') === 'Open').length, countLabel: 'open',
    },
    {
      to: '/auctions', icon: Gavel, label: 'Auctions',
      description: 'Live and upcoming equipment auctions — bid in real time.',
      count: auctions.filter(a => a.status === 'Live').length, countLabel: 'live now',
    },
    {
      to: '/collaborations', icon: Handshake, label: 'Collaborations',
      description: 'Partnership and joint-venture opportunities across the value chain.',
      count: collaborations.filter(c => (c.status || 'Open') === 'Open').length, countLabel: 'open',
    },
    {
      to: '/rate-card', icon: DollarSign, label: 'Rate Card',
      description: 'Advertising and marketplace pricing for exhibitors.',
      count: null,
    },
  ];

  return (
    <div className="pb-24 max-w-2xl lg:max-w-4xl mx-auto px-4 pt-5">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Marketplace</h1>
      <p className="text-muted-foreground text-sm mb-5">Jobs, tenders, auctions, and collaborations from exhibitors across the agricultural value chain.</p>

      <div className="grid gap-3">
        {cards.map(({ to, icon: Icon, label, description, count, countLabel }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 hover:shadow-md active:scale-[0.98] transition-all duration-150 select-none shadow-sm"
          >
            <div className="w-11 h-11 rounded-xl bg-steel flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{label}</p>
                {count !== null && count > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber/15 text-amber flex-shrink-0">
                    {count} {countLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
