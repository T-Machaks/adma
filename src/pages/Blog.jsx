import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlogPost } from '@/api/entities';
import { Search, Newspaper, Calendar } from 'lucide-react';
import { BLOG_CATEGORIES } from '@/lib/blogConstants';
import ListingCard from '@/components/shared/ListingCard';
import { useSEO } from '@/lib/useSEO';

const CATEGORIES = ['All', ...BLOG_CATEGORIES];

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Blog() {
  useSEO({
    title: 'Blog',
    description: 'News, farming tips, exhibitor spotlights and updates from the ADMA Agri Show and the wider Zimbabwe agricultural sector.',
    path: '/blog',
  });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: () => BlogPost.list('-created_date'),
  });

  // Same convention as Jobs.jsx / Tenders.jsx / Collaborations.jsx: the list endpoint
  // is public and returns every record (organizer content is small enough this never
  // needed a second admin-only endpoint) — Draft posts are filtered out client-side.
  const published = posts.filter(p => (p.status || 'Draft') === 'Published');

  const filtered = published.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      p.title?.toLowerCase().includes(q) ||
      p.excerpt?.toLowerCase().includes(q) ||
      p.author_name?.toLowerCase().includes(q);
    const matchCategory = category === 'All' || p.category === category;
    return matchSearch && matchCategory;
  });

  return (
    <div className="pb-24 px-4 pt-5 max-w-2xl lg:max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold uppercase tracking-wide mb-1">Blog</h1>
      <p className="text-sm text-muted-foreground mb-4">News, tips and updates from ADMA Digital</p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search posts…"
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

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} post{filtered.length !== 1 ? 's' : ''}</p>

      {isLoading && <div className="text-center py-12 text-muted-foreground text-sm">Loading posts…</div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No posts match your search.</p>
        </div>
      )}

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-3">
        {filtered.map(p => (
          <ListingCard
            key={p.id}
            to={`/blog/${p.id}`}
            title={p.title}
            companyName={[p.category, p.author_name].filter(Boolean).join(' · ')}
            imageUrl={p.cover_image_url}
            displayFormat={p.cover_image_url ? 'image_tile' : 'text'}
            icon={Newspaper}
            meta={<>
              {(p.published_date || p.created_date) && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(p.published_date || p.created_date)}</span>
              )}
            </>}
          />
        ))}
      </div>
    </div>
  );
}
