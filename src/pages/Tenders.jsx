import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TenderListing } from '@/api/entities';
import { Search, FileText, Clock, ChevronRight } from 'lucide-react';
import { EVENT_CONFIG } from '@/lib/eventConfig';

const CATEGORIES = ['All', ...EVENT_CONFIG.exhibitorCategories];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(iso) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Tenders() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ['tender-listings'],
    queryFn: () => TenderListing.list('-created_date'),
  });

  const open = tenders.filter(t => (t.status || 'Open') === 'Open');

  const filtered = open.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.title?.toLowerCase().includes(q) ||
      t.company_name?.toLowerCase().includes(q);
    const matchCategory = category === 'All' || t.category === category;
    return matchSearch && matchCategory;
  });

  const featured = filtered.filter(t => t.display_format === 'featured_banner');
  const regular = filtered.filter(t => t.display_format !== 'featured_banner');

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Tenders</h1>
      <p className="text-sm text-muted-foreground mb-4">Procurement opportunities posted by exhibitors</p>

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
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${category === c ? 'bg-amber text-white border-amber' : 'border-border text-muted-foreground hover:border-amber/50'}`}>
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} open tender{filtered.length !== 1 ? 's' : ''}</p>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading tenders…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No open tenders match your search.</p>
        </div>
      )}

      {featured.length > 0 && (
        <div className="space-y-3 mb-4">
          {featured.map(t => {
            const left = daysLeft(t.closing_date);
            return (
              <Link
                key={t.id}
                to={`/tenders/${t.id}`}
                className="block rounded-2xl overflow-hidden border border-amber/40 shadow-sm hover:shadow-md transition-shadow"
              >
                {t.display_image_url && (
                  <div className="h-32 w-full bg-muted">
                    <img src={t.display_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4 bg-card">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-amber bg-amber/10 px-2 py-0.5 rounded-full">Featured</span>
                  <p className="font-heading font-bold text-base mt-1.5">{t.title}</p>
                  <p className="text-xs text-amber font-medium mt-0.5">{t.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {t.category && <span className="bg-muted px-2 py-0.5 rounded font-medium">{t.category}</span>}
                    {t.closing_date && (
                      <span className={`flex items-center gap-1 ${left !== null && left <= 3 ? 'text-red-500 font-semibold' : ''}`}>
                        <Clock className="w-3 h-3" /> Closes {fmtDate(t.closing_date)}{left !== null && left >= 0 ? ` · ${left}d left` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {regular.map(t => {
          const left = daysLeft(t.closing_date);
          return (
            <Link
              key={t.id}
              to={`/tenders/${t.id}`}
              className="block bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                {t.display_format === 'image_tile' && t.display_image_url && (
                  <img src={t.display_image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t.title}</p>
                  <p className="text-xs text-amber font-medium mt-0.5">{t.company_name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {t.category && <span className="bg-muted px-2 py-0.5 rounded font-medium">{t.category}</span>}
                    {t.closing_date && (
                      <span className={`flex items-center gap-1 ${left !== null && left <= 3 ? 'text-red-500 font-semibold' : ''}`}>
                        <Clock className="w-3 h-3" /> Closes {fmtDate(t.closing_date)}{left !== null && left >= 0 ? ` · ${left}d left` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
