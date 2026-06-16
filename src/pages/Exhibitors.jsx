import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Exhibitor } from '@/api/entities';
import { Search, Calendar, Globe, Phone, Mail, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import TierBadge from '@/components/ui/TierBadge';
import { track } from '@/lib/tracking';

const CATEGORIES = ['All', 'Equipment', 'Services', 'Suppliers', 'Solutions'];
const TIERS = ['All', 'Diamond', 'Gold', 'Chrome', 'Copper'];
const SECTIONS = ['All', 'Main Hall', 'Exhibition Hall', 'Suppliers Zone', 'Solutions Zone'];

export default function Exhibitors() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [tier, setTier] = useState('All');
  const [section, setSection] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const { data: exhibitors = [], isLoading } = useQuery({
    queryKey: ['exhibitors'],
    queryFn: () => Exhibitor.list('-created_date'),
  });

  const filtered = exhibitors.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase()) || ex.booth?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || ex.category === category;
    const matchTier = tier === 'All' || ex.tier === tier;
    const matchSection = section === 'All' || ex.section === section;
    return matchSearch && matchCat && matchTier && matchSection;
  });

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-4">Exhibitor Directory</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by company or booth…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1"><Filter className="w-3 h-3" /> Category</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${category === c ? 'bg-amber text-white border-amber' : 'border-border text-muted-foreground hover:border-amber/50'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Tier</p>
            <div className="flex gap-2 flex-wrap">
              {TIERS.map(t => (
                <button key={t} onClick={() => setTier(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${tier === t ? 'bg-steel text-white border-steel' : 'border-border text-muted-foreground hover:border-steel/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Section</p>
            <div className="flex gap-2 flex-wrap">
              {SECTIONS.map(s => (
                <button key={s} onClick={() => setSection(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${section === s ? 'bg-steel text-white border-steel' : 'border-border text-muted-foreground hover:border-steel/50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} exhibitor{filtered.length !== 1 ? 's' : ''} found</p>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading exhibitors…</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No exhibitors match your search.</p>
          <button onClick={() => { setSearch(''); setCategory('All'); setTier('All'); setSection('All'); }} className="text-amber text-sm mt-2 underline">Clear filters</button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(ex => (
          <div key={ex.id} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="p-4 flex items-start gap-3">
              <div className="w-11 h-11 bg-white border border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {ex.logo_url
                  ? <img src={ex.logo_url} alt={ex.name} className="w-10 h-10 object-contain" />
                  : <span className="font-heading text-xl font-bold text-muted-foreground">{ex.name?.[0] || '?'}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{ex.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Booth <span className="font-bold text-foreground">{ex.booth}</span> · {ex.section || 'General'}</p>
                  </div>
                  <TierBadge tier={ex.tier} />
                </div>
                {ex.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{ex.description}</p>}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-medium text-muted-foreground">{ex.category}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border px-4 py-2.5 flex gap-2 items-center justify-between">
              <button
                onClick={() => {
                  const opening = expanded !== ex.id;
                  setExpanded(opening ? ex.id : null);
                  if (opening) track(ex.id, ex.name, 'profile_view', 'directory');
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded === ex.id ? 'Less info ↑' : 'More info ↓'}
              </button>
              <div className="flex gap-2">
                {ex.website && (
                  <a href={ex.website} target="_blank" rel="noreferrer" className="text-xs border border-border px-3 py-1.5 rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Website
                  </a>
                )}
                <Link
                  to="/meetings"
                  state={{ exhibitor: ex }}
                  onClick={() => track(ex.id, ex.name, 'meeting_click', 'directory')}
                  className="text-xs bg-amber text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 hover:opacity-90 transition-opacity"
                >
                  <Calendar className="w-3 h-3" /> Book Meeting
                </Link>
              </div>
            </div>

            {/* Expanded contact */}
            {expanded === ex.id && (
              <div className="border-t border-border px-4 py-3 bg-muted/30 space-y-1.5">
                {ex.contact_email && (
                  <a href={`mailto:${ex.contact_email}`} className="flex items-center gap-2 text-xs text-foreground/80 hover:text-amber transition-colors">
                    <Mail className="w-3.5 h-3.5" /> {ex.contact_email}
                  </a>
                )}
                {ex.contact_phone && (
                  <a href={`tel:${ex.contact_phone}`} className="flex items-center gap-2 text-xs text-foreground/80 hover:text-amber transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {ex.contact_phone}
                  </a>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3.5 h-3.5 text-center">📍</span> QR resources available at the booth
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
