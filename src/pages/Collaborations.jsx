import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Collaboration } from '@/api/entities';
import { Search, Handshake, Clock, ChevronRight } from 'lucide-react';
import { COLLABORATION_TYPES } from '@/lib/collaborationConstants';

const TYPES = ['All', ...COLLABORATION_TYPES];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Collaborations() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['collaborations'],
    queryFn: () => Collaboration.list('-created_date'),
  });

  const open = items.filter(c => (c.status || 'Pending') === 'Open');

  const filtered = open.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.title?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q);
    const matchType = type === 'All' || c.type === type;
    return matchSearch && matchType;
  });

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Partner Collaborations</h1>
      <p className="text-sm text-muted-foreground mb-4">Outgrower schemes, contract farming and joint venture opportunities posted by exhibitors</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or company…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${type === t ? 'bg-amber text-white border-amber' : 'border-border text-muted-foreground hover:border-amber/50'}`}>
            {t}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} open opportunit{filtered.length !== 1 ? 'ies' : 'y'}</p>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading collaborations…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No open collaboration opportunities match your search.</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => (
          <Link
            key={c.id}
            to={`/collaborations/${c.id}`}
            className="block bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{c.title}</p>
                <p className="text-xs text-amber font-medium mt-0.5">{c.company_name}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {c.type && <span className="bg-muted px-2 py-0.5 rounded font-medium">{c.type}</span>}
                  {c.closing_date && (
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Closes {fmtDate(c.closing_date)}</span>
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
