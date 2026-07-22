import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Auction, Lot } from '@/api/entities';
import {
  Gavel, Plus, Edit2, Trash2, Package, ChevronDown, ChevronUp, ImagePlus, X,
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
import { LOT_CATEGORIES, AUCTION_TYPES } from '@/lib/auctionConstants';
import { resizeImageToBlob } from '@/lib/imageUtils';

const AUCTION_STATUS_STYLES = {
  Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Live:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Closed:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const EMPTY_AUCTION = { title: '', type: 'Timed', location: '', description: '', start_date: '', end_date: '', status: 'Upcoming' };
const EMPTY_LOT = {
  lot_number: '', title: '', category: LOT_CATEGORIES[0], seller_name: '', description: '',
  starting_bid: '', reserve_price: '', bid_increment: '10', closing_time: '', status: 'Upcoming', images: [],
  breed: '', registration_number: '', sire: '', dam: '', age: '', sex: '',
};

export default function AuctionsManager() {
  const qc = useQueryClient();
  const [auctionDialog, setAuctionDialog] = useState(false);
  const [editAuctionId, setEditAuctionId] = useState(null);
  const [auctionForm, setAuctionForm] = useState(EMPTY_AUCTION);
  const [deleteAuctionId, setDeleteAuctionId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const [lotDialog, setLotDialog] = useState(false);
  const [lotAuctionId, setLotAuctionId] = useState(null);
  const [editLotId, setEditLotId] = useState(null);
  const [lotForm, setLotForm] = useState(EMPTY_LOT);
  const [deleteLotId, setDeleteLotId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['auctions'],
    queryFn: () => Auction.list('-created_date'),
  });
  const { data: lots = [] } = useQuery({
    queryKey: ['lots'],
    queryFn: () => Lot.list(),
  });

  const saveAuction = useMutation({
    mutationFn: (data) => editAuctionId ? Auction.update(editAuctionId, data) : Auction.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auctions'] }); setAuctionDialog(false); },
  });
  const deleteAuction = useMutation({
    mutationFn: (id) => Auction.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auctions'] }); setDeleteAuctionId(null); },
  });
  const quickAuctionStatus = useMutation({
    mutationFn: ({ id, status }) => Auction.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions'] }),
  });

  const saveLot = useMutation({
    mutationFn: (data) => editLotId ? Lot.update(editLotId, data) : Lot.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lots'] }); setLotDialog(false); },
  });
  const deleteLot = useMutation({
    mutationFn: (id) => Lot.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lots'] }); setDeleteLotId(null); },
  });

  const openCreateAuction = () => { setEditAuctionId(null); setAuctionForm(EMPTY_AUCTION); setAuctionDialog(true); };
  const openEditAuction = (a) => {
    setEditAuctionId(a.id);
    setAuctionForm({
      title: a.title || '', type: a.type || 'Timed', location: a.location || '', description: a.description || '',
      start_date: a.start_date ? a.start_date.slice(0, 16) : '', end_date: a.end_date ? a.end_date.slice(0, 16) : '',
      status: a.status || 'Upcoming',
    });
    setAuctionDialog(true);
  };
  const handleAuctionSubmit = (e) => {
    e.preventDefault();
    if (!auctionForm.title.trim()) return;
    saveAuction.mutate({
      ...auctionForm,
      start_date: auctionForm.start_date ? new Date(auctionForm.start_date).toISOString() : null,
      end_date: auctionForm.end_date ? new Date(auctionForm.end_date).toISOString() : null,
    });
  };

  const openCreateLot = (auctionId) => {
    setLotAuctionId(auctionId);
    setEditLotId(null);
    setLotForm(EMPTY_LOT);
    setLotDialog(true);
  };
  const openEditLot = (lot) => {
    setLotAuctionId(lot.auction_id);
    setEditLotId(lot.id);
    setLotForm({
      lot_number: lot.lot_number || '', title: lot.title || '', category: lot.category || LOT_CATEGORIES[0],
      seller_name: lot.seller_name || '', description: lot.description || '',
      starting_bid: lot.starting_bid ?? '', reserve_price: lot.reserve_price ?? '', bid_increment: lot.bid_increment ?? '10',
      closing_time: lot.closing_time ? lot.closing_time.slice(0, 16) : '', status: lot.status || 'Upcoming', images: lot.images || [],
      breed: lot.breed || '', registration_number: lot.registration_number || '', sire: lot.sire || '', dam: lot.dam || '',
      age: lot.age || '', sex: lot.sex || '',
    });
    setLotDialog(true);
  };
  const handleLotSubmit = (e) => {
    e.preventDefault();
    if (!lotForm.title.trim()) return;
    saveLot.mutate({
      ...lotForm,
      auction_id: lotAuctionId,
      starting_bid: Number(lotForm.starting_bid) || 0,
      reserve_price: lotForm.reserve_price === '' ? null : Number(lotForm.reserve_price),
      bid_increment: Number(lotForm.bid_increment) || 1,
      closing_time: lotForm.closing_time ? new Date(lotForm.closing_time).toISOString() : null,
    });
  };

  const handleLotImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editLotId) return;
    setUploadingImage(true);
    try {
      const blob = await resizeImageToBlob(file);
      const { uploadUrl, publicUrl } = await Lot.getImageUploadUrl(editLotId);
      const s3Res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
      setLotForm(f => ({ ...f, images: [...f.images, publicUrl] }));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };
  const removeLotImage = (i) => setLotForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const live = auctions.filter(a => a.status === 'Live');
  const upcoming = auctions.filter(a => (a.status || 'Upcoming') === 'Upcoming');
  const closed = auctions.filter(a => a.status === 'Closed');

  return (
    <div className="pb-12 px-4 sm:px-6 pt-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide">Auctions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage livestock and equipment auctions and their lots.</p>
        </div>
        <Button onClick={openCreateAuction} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Auction
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Live', value: live.length, color: 'text-red-500', dot: live.length > 0 },
          { label: 'Upcoming', value: upcoming.length, color: 'text-blue-500' },
          { label: 'Closed', value: closed.length, color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`font-heading text-3xl font-bold ${s.color} flex items-center justify-center gap-1.5`}>
              {s.dot && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
              {s.value}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground py-8 text-center">Loading auctions…</div>}

      {!isLoading && auctions.length === 0 && (
        <div className="border border-dashed border-border rounded-2xl p-12 text-center">
          <Gavel className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">No auctions yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create the first auction to get started.</p>
          <Button onClick={openCreateAuction} variant="outline">New Auction</Button>
        </div>
      )}

      <div className="space-y-3">
        {auctions.map(a => {
          const auctionLots = lots.filter(l => l.auction_id === a.id);
          const isOpen = expanded === a.id;
          return (
            <div key={a.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${AUCTION_STATUS_STYLES[a.status] || AUCTION_STATUS_STYLES.Upcoming}`}>{a.status || 'Upcoming'}</span>
                    <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">{a.type || 'Timed'}</span>
                  </div>
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.location} · {auctionLots.length} lot{auctionLots.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {a.status !== 'Live' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => quickAuctionStatus.mutate({ id: a.id, status: 'Live' })}>
                      Go Live
                    </Button>
                  )}
                  {a.status === 'Live' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => quickAuctionStatus.mutate({ id: a.id, status: 'Closed' })}>
                      Close
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEditAuction(a)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteAuctionId(a.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setExpanded(isOpen ? null : a.id)}>
                    {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Lots</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCreateLot(a.id)}><Plus className="w-3.5 h-3.5 mr-1" /> Add Lot</Button>
                  </div>
                  {auctionLots.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No lots yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {auctionLots.map(lot => (
                        <div key={lot.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                            {lot.images?.[0] && <img src={lot.images[0]} alt={lot.title} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">Lot {lot.lot_number} — {lot.title}</p>
                            <p className="text-xs text-muted-foreground">{lot.category} · ${lot.current_bid ?? lot.starting_bid ?? 0} · {lot.status}</p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => openEditLot(lot)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 flex-shrink-0 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setDeleteLotId(lot.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
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

      {/* Auction dialog */}
      <Dialog open={auctionDialog} onOpenChange={setAuctionDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editAuctionId ? 'Edit Auction' : 'New Auction'}</DialogTitle></DialogHeader>
          <form onSubmit={handleAuctionSubmit} className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title *</label>
              <Input value={auctionForm.title} onChange={e => setAuctionForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. ADMA Livestock & Equipment Auction" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Type</label>
                <Select value={auctionForm.type} onValueChange={v => setAuctionForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUCTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Location</label>
                <Input value={auctionForm.location} onChange={e => setAuctionForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Field Zone" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Textarea value={auctionForm.description} onChange={e => setAuctionForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Start</label>
                <Input type="datetime-local" value={auctionForm.start_date} onChange={e => setAuctionForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">End</label>
                <Input type="datetime-local" value={auctionForm.end_date} onChange={e => setAuctionForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
              <Select value={auctionForm.status} onValueChange={v => setAuctionForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAuctionDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saveAuction.isPending}>{saveAuction.isPending ? 'Saving…' : editAuctionId ? 'Save Changes' : 'Create Auction'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lot dialog */}
      <Dialog open={lotDialog} onOpenChange={setLotDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editLotId ? 'Edit Lot' : 'New Lot'}</DialogTitle></DialogHeader>
          <form onSubmit={handleLotSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Lot #</label>
                <Input value={lotForm.lot_number} onChange={e => setLotForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Title *</label>
                <Input value={lotForm.title} onChange={e => setLotForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Brahman Bull, 3yrs" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Category</label>
                <Select value={lotForm.category} onValueChange={v => setLotForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Seller</label>
                <Input value={lotForm.seller_name} onChange={e => setLotForm(f => ({ ...f, seller_name: e.target.value }))} placeholder="Seller / consignor name" />
              </div>
            </div>

            {lotForm.category === 'Livestock' && (
              <div className="space-y-3 border border-amber/30 bg-amber/5 rounded-lg p-3">
                <p className="text-xs text-amber font-semibold">
                  Pedigree cattle listing — sellers must be listed here before participating in the CC Sales pedigree cattle auction.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Breed</label>
                    <Input value={lotForm.breed} onChange={e => setLotForm(f => ({ ...f, breed: e.target.value }))} placeholder="e.g. Brahman" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Registration #</label>
                    <Input value={lotForm.registration_number} onChange={e => setLotForm(f => ({ ...f, registration_number: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sire</label>
                    <Input value={lotForm.sire} onChange={e => setLotForm(f => ({ ...f, sire: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Dam</label>
                    <Input value={lotForm.dam} onChange={e => setLotForm(f => ({ ...f, dam: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Age</label>
                    <Input value={lotForm.age} onChange={e => setLotForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 3 years" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Sex</label>
                    <Select value={lotForm.sex || undefined} onValueChange={v => setLotForm(f => ({ ...f, sex: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Description</label>
              <Textarea value={lotForm.description} onChange={e => setLotForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Starting Bid</label>
                <Input type="number" value={lotForm.starting_bid} onChange={e => setLotForm(f => ({ ...f, starting_bid: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Reserve</label>
                <Input type="number" value={lotForm.reserve_price} onChange={e => setLotForm(f => ({ ...f, reserve_price: e.target.value }))} placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Increment</label>
                <Input type="number" value={lotForm.bid_increment} onChange={e => setLotForm(f => ({ ...f, bid_increment: e.target.value }))} placeholder="10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Closing Time</label>
                <Input type="datetime-local" value={lotForm.closing_time} onChange={e => setLotForm(f => ({ ...f, closing_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Status</label>
                <Select value={lotForm.status} onValueChange={v => setLotForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Upcoming">Upcoming</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="Sold">Sold</SelectItem>
                    <SelectItem value="Unsold">Unsold</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Upcoming = pre-auction catalogue only, not yet biddable.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 block">Images</label>
              {!editLotId ? (
                <p className="text-xs text-muted-foreground">Save the lot first, then reopen it to upload images.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {lotForm.images.map((src, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-border" />
                      <button type="button" onClick={() => removeLotImage(i)} className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className={`w-16 h-16 flex flex-col items-center justify-center gap-0.5 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors ${uploadingImage ? 'opacity-60 pointer-events-none' : ''}`}>
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">{uploadingImage ? '…' : 'Add'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLotImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLotDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saveLot.isPending}>{saveLot.isPending ? 'Saving…' : editLotId ? 'Save Changes' : 'Create Lot'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete auction confirm */}
      <Dialog open={!!deleteAuctionId} onOpenChange={open => !open && setDeleteAuctionId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Auction</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This auction and its lot listings will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteAuctionId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteAuction.isPending} onClick={() => deleteAuction.mutate(deleteAuctionId)}>{deleteAuction.isPending ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete lot confirm */}
      <Dialog open={!!deleteLotId} onOpenChange={open => !open && setDeleteLotId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Lot</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This lot and its bid history will be permanently deleted.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteLotId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteLot.isPending} onClick={() => deleteLot.mutate(deleteLotId)}>{deleteLot.isPending ? 'Deleting…' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
