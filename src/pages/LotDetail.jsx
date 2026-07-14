import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lot, Bid, AttendeeNote } from '@/api/entities';
import { useAuth } from '@/lib/AuthContext';
import CountdownTimer from '@/components/auction/CountdownTimer';
import {
  ArrowLeft, Package, Gavel, Star, User, Lock, LogIn, UserPlus,
  ShieldCheck, ShieldAlert, TrendingUp, Hash,
} from 'lucide-react';

export default function LotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [activeImg, setActiveImg] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [myPaddle, setMyPaddle] = useState(null);

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => Lot.get(id),
    refetchInterval: 5000,
  });

  const { data: bids = [] } = useQuery({
    queryKey: ['bids', id],
    queryFn: () => Bid.filterByLot(id),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['attendee-notes', user?.email],
    queryFn: () => AttendeeNote.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const watchNote = notes.find(n => n.type === 'Lot' && n.ref_id === id);

  const watchMutation = useMutation({
    mutationFn: () => watchNote
      ? AttendeeNote.delete(watchNote.id)
      : AttendeeNote.create({ user_email: user.email, type: 'Lot', ref_id: id, ref_name: lot?.title, note: '', is_favorite: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendee-notes', user?.email] }),
  });

  useEffect(() => {
    if (!user?.email || myPaddle) return;
    const mine = bids.find(b => b.bidder_email?.toLowerCase() === user.email.toLowerCase());
    if (mine) setMyPaddle(mine.paddle_number);
  }, [bids, user, myPaddle]);

  const bidMutation = useMutation({
    mutationFn: (amount) => Lot.placeBid(id, {
      bidder_name: user.full_name || user.email,
      bidder_email: user.email,
      amount,
    }),
    onSuccess: (res) => {
      setMyPaddle(res.paddle_number);
      setBidError('');
      setCustomAmount('');
      qc.invalidateQueries({ queryKey: ['lot', id] });
      qc.invalidateQueries({ queryKey: ['bids', id] });
    },
    onError: (err) => setBidError(err.message || 'Bid failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-amber/30 border-t-amber rounded-full animate-spin" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-muted-foreground text-sm">Lot not found.</p>
        <button onClick={() => navigate('/auctions')} className="mt-3 text-amber text-sm underline">Back to auctions</button>
      </div>
    );
  }

  const increment = Number(lot.bid_increment) || 1;
  const minNext = lot.current_bid ? Number(lot.current_bid) + increment : (Number(lot.starting_bid) || increment);
  const isOpen = lot.status === 'Open';
  const reserveMet = lot.reserve_price != null ? (Number(lot.current_bid) || 0) >= Number(lot.reserve_price) : null;
  const sortedBids = [...bids].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));

  const submitBid = (amount) => {
    setBidError('');
    if (!Number.isFinite(amount) || amount < minNext) {
      setBidError(`Minimum bid is $${minNext}`);
      return;
    }
    bidMutation.mutate(amount);
  };

  return (
    <div className="pb-24 max-w-4xl mx-auto">
      <div className="px-4 pt-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {isAuthenticated && (
          <button
            onClick={() => watchMutation.mutate()}
            disabled={watchMutation.isPending}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              watchNote ? 'border-amber bg-amber/10 text-amber' : 'border-border text-muted-foreground hover:border-amber/40'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${watchNote ? 'fill-amber' : ''}`} /> {watchNote ? 'Watching' : 'Watch Lot'}
          </button>
        )}
      </div>

      <div className="px-4 mt-4 lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Left: images + description */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {lot.images?.[activeImg] ? (
                <img src={lot.images[activeImg]} alt={lot.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="w-12 h-12" />
                </div>
              )}
              <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded bg-black/60 text-white">Lot {lot.lot_number}</span>
            </div>
            {lot.images?.length > 1 && (
              <div className="flex gap-2 p-2 overflow-x-auto">
                {lot.images.map((src, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${activeImg === i ? 'border-amber' : 'border-transparent'}`}>
                    <img src={src} alt={`${lot.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">{lot.category}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lot.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : lot.status === 'Sold' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>{lot.status}</span>
            </div>
            <h1 className="font-heading text-xl font-bold mt-2">{lot.title}</h1>
            {lot.seller_name && <p className="text-xs text-muted-foreground mt-1">Seller: <span className="font-medium text-foreground">{lot.seller_name}</span></p>}
            {lot.description && <p className="text-sm text-foreground/80 leading-relaxed mt-3 whitespace-pre-wrap">{lot.description}</p>}
          </div>

          {/* Bid history */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber" /> Bid History
            </h2>
            {sortedBids.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No bids yet — be the first.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {sortedBids.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Hash className="w-3 h-3" /> Bidder #{b.paddle_number}
                    </span>
                    <span className="font-bold text-foreground">${b.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: bidding panel */}
        <div className="lg:col-span-2 space-y-4 mt-4 lg:mt-0">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{lot.current_bid ? 'Current Bid' : 'Starting Bid'}</p>
            <p className="font-heading text-3xl font-bold text-amber mt-1">${lot.current_bid ?? lot.starting_bid ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{lot.bid_count || 0} bid{lot.bid_count !== 1 ? 's' : ''}</p>

            {lot.reserve_price != null && (
              <div className={`flex items-center gap-1.5 mt-3 text-xs font-semibold ${reserveMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                {reserveMet ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {reserveMet ? 'Reserve met' : 'Reserve not yet met'}
              </div>
            )}

            {isOpen && lot.closing_time && (
              <div className="mt-4 bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Closes in</p>
                <p className="font-heading text-lg font-bold"><CountdownTimer target={lot.closing_time} endedLabel="Closing…" /></p>
              </div>
            )}

            {myPaddle && (
              <p className="text-xs text-muted-foreground mt-3">Your paddle number: <span className="font-bold text-foreground">#{myPaddle}</span></p>
            )}
          </div>

          {!isOpen ? (
            <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center text-sm text-muted-foreground">
              {lot.status === 'Upcoming' ? 'Bidding has not opened for this lot yet.' : 'Bidding has closed for this lot.'}
            </div>
          ) : !isAuthenticated ? (
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-3 text-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sign in to register and place a bid.</p>
              <div className="flex gap-2">
                <Link to="/login" className="flex items-center gap-1.5 bg-amber text-white text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </Link>
                <Link to="/register" className="flex items-center gap-1.5 border border-border text-xs font-semibold px-4 py-2 rounded-lg hover:bg-muted transition-colors">
                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="w-4 h-4 text-amber" />
                <h2 className="font-heading text-sm font-bold uppercase tracking-wide">Place a Bid</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => submitBid(minNext)}
                  disabled={bidMutation.isPending}
                  className="bg-amber text-white font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition-colors disabled:opacity-60"
                >
                  Bid ${minNext}
                </button>
                <button
                  onClick={() => submitBid(minNext + increment)}
                  disabled={bidMutation.isPending}
                  className="border border-border font-semibold text-sm py-2.5 rounded-xl hover:bg-muted transition-colors disabled:opacity-60"
                >
                  Bid ${minNext + increment}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  placeholder={`Custom amount (min $${minNext})`}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                />
                <button
                  onClick={() => submitBid(Number(customAmount))}
                  disabled={bidMutation.isPending || !customAmount}
                  className="px-4 py-2 rounded-lg bg-steel text-white text-sm font-semibold hover:bg-steel/90 transition-colors disabled:opacity-50"
                >
                  Bid
                </button>
              </div>
              {bidError && <p className="text-xs text-red-500 mt-2">{bidError}</p>}
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Bidding as {user.full_name || user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
