import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Auction, Lot } from '@/api/entities';
import { ArrowLeft, MapPin, Radio, Package, Gavel } from 'lucide-react';
import CountdownTimer from '@/components/auction/CountdownTimer';
import { LOT_CATEGORIES } from '@/lib/auctionConstants';

const CATEGORIES = ['All', ...LOT_CATEGORIES];

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState('All');

  const { data: auction, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => Auction.get(id),
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots', 'auction', id],
    queryFn: () => Lot.filterByAuction(id),
    refetchInterval: 10000,
  });

  const filtered = lots.filter(l => category === 'All' || l.category === category)
    .sort((a, b) => (a.lot_number || '').localeCompare(b.lot_number || '', undefined, { numeric: true }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">Auction not found.</p>
        <button onClick={() => navigate('/auctions')} className="mt-3 text-amber text-sm underline">Back to auctions</button>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-4xl mx-auto">
      <div className="px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to auctions
        </button>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="font-heading text-xl font-bold">{auction.title}</h1>
            {auction.status === 'Live' && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
              </span>
            )}
          </div>
          {auction.description && <p className="text-sm text-muted-foreground mt-1">{auction.description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {auction.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {auction.location}</span>}
            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {lots.length} lot{lots.length !== 1 ? 's' : ''}</span>
            {auction.status === 'Live' && auction.end_date && (
              <span className="flex items-center gap-1">Auction closes in <CountdownTimer target={auction.end_date} /></span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${category === c ? 'bg-amber text-white border-amber' : 'border-border text-muted-foreground hover:border-amber/50'}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Gavel className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No lots in this category yet.</p>
        </div>
      ) : (
        <div className="px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(lot => (
            <Link key={lot.id} to={`/lots/${lot.id}`} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative">
                {lot.images?.[0] ? (
                  <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Package className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">Lot {lot.lot_number}</span>
                {lot.status === 'Closed' && (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold uppercase">Closed</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold line-clamp-2 leading-tight">{lot.title}</p>
                <p className="text-sm font-bold text-amber mt-1">
                  ${lot.current_bid ?? lot.starting_bid ?? 0}
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">{lot.current_bid ? `· ${lot.bid_count || 0} bid${lot.bid_count !== 1 ? 's' : ''}` : 'starting'}</span>
                </p>
                {lot.status === 'Open' && lot.closing_time && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <CountdownTimer target={lot.closing_time} />
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
