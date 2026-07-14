import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Auction, Lot } from '@/api/entities';
import { Gavel, MapPin, Package, Radio, ChevronRight } from 'lucide-react';
import CountdownTimer from '@/components/auction/CountdownTimer';

const TABS = [
  { id: 'Live', label: 'Live' },
  { id: 'Upcoming', label: 'Upcoming' },
  { id: 'Closed', label: 'Past' },
];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Auctions() {
  const [tab, setTab] = useState('Live');

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => Auction.list('-created_date'),
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots'],
    queryFn: () => Lot.list(),
  });

  const lotCount = (auctionId) => lots.filter(l => l.auction_id === auctionId).length;

  const filtered = auctions.filter(a => (a.status || 'Upcoming') === tab);

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1 flex items-center gap-2">
        <Gavel className="w-6 h-6 text-amber" /> Auctions
      </h1>
      <p className="text-sm text-muted-foreground mb-4">Livestock and equipment auctions from exhibitors</p>

      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-5 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.id ? 'bg-steel text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.id === 'Live' && <Radio className="w-3 h-3" />}
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading auctions…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Gavel className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No {tab.toLowerCase()} auctions right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(a => (
          <Link
            key={a.id}
            to={`/auctions/${a.id}`}
            className="block bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{a.title}</p>
                  {a.status === 'Live' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                    </span>
                  )}
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{a.type || 'Timed'} Auction</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {a.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>}
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {lotCount(a.id)} lot{lotCount(a.id) !== 1 ? 's' : ''}</span>
                  {a.status === 'Live' && a.end_date && (
                    <span>Closes in <CountdownTimer target={a.end_date} /></span>
                  )}
                  {a.status === 'Upcoming' && a.start_date && (
                    <span>Starts {fmtDate(a.start_date)}</span>
                  )}
                  {a.status === 'Closed' && a.end_date && (
                    <span>Ended {fmtDate(a.end_date)}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
